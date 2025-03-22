import { z } from "zod";

export type OutputTypeOfZodTupleWithOptional<
  T extends z.ZodTupleItems | [] = z.ZodTupleItems,
> = T extends [infer Head, ...infer Tail]
  ? Head extends z.ZodTypeAny
    ? Tail extends z.ZodTupleItems | []
      ? undefined extends z.output<Head>
        ? [
            Exclude<z.output<Head>, undefined>?,
            ...OutputTypeOfZodTupleWithOptional<Tail>,
          ]
        : [z.output<Head>, ...OutputTypeOfZodTupleWithOptional<Tail>]
      : never
    : never
  : [];

export type OutputTypeOfZodTupleWithOptionalWithRest<
  T extends z.ZodTupleItems | [] = z.ZodTupleItems,
  Rest extends z.ZodTypeAny | null = null,
> = Rest extends z.ZodTypeAny
  ? [...OutputTypeOfZodTupleWithOptional<T>, ...z.output<Rest>[]]
  : OutputTypeOfZodTupleWithOptional<T>;

export type InputTypeOfZodTupleWithOptional<
  T extends z.ZodTupleItems | [] = z.ZodTupleItems,
> = T extends [infer Head, ...infer Tail]
  ? Head extends z.ZodTypeAny
    ? Tail extends z.ZodTupleItems | []
      ? undefined extends z.input<Head>
        ? [
            Exclude<z.input<Head>, undefined>?,
            ...InputTypeOfZodTupleWithOptional<Tail>,
          ]
        : [z.input<Head>, ...InputTypeOfZodTupleWithOptional<Tail>]
      : never
    : never
  : [];

export type InputTypeOfZodTupleWithOptionalWithRest<
  T extends z.ZodTupleItems | [] = z.ZodTupleItems,
  Rest extends z.ZodTypeAny | null = null,
> = Rest extends z.ZodTypeAny
  ? [...InputTypeOfZodTupleWithOptional<T>, ...z.input<Rest>[]]
  : InputTypeOfZodTupleWithOptional<T>;

export interface ZodTupleWithOptionalDef<
  T extends z.ZodTupleItems | [] = z.ZodTupleItems,
  Rest extends z.ZodTypeAny | null = null,
> extends z.ZodTypeDef {
  items: T;
  rest: Rest;
  typeName: "ZodTupleWithOptional";
}

export type AnyZodTupleWithOptional = ZodTupleWithOptional<
  z.ZodTupleItems | [],
  z.ZodTypeAny | null
>;

export class ZodTupleWithOptional<
  T extends z.ZodTupleItems | [] = z.ZodTupleItems,
  Rest extends z.ZodTypeAny | null = null,
> extends z.ZodType<
  OutputTypeOfZodTupleWithOptionalWithRest<T, Rest>,
  ZodTupleWithOptionalDef<T, Rest>,
  InputTypeOfZodTupleWithOptionalWithRest<T, Rest>
> {
  _parse(input: z.ParseInput): z.ParseReturnType<z.output<this>> {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== z.ZodParsedType.array) {
      z.addIssueToContext(ctx, {
        code: z.ZodIssueCode.invalid_type,
        expected: z.ZodParsedType.array,
        received: ctx.parsedType,
      });
      return z.INVALID;
    }
    const inputItems = [...(ctx.data as unknown[])];
    const schemas = [...this._def.items];
    if (inputItems.length < schemas.length) {
      inputItems.push(
        ...Array(schemas.length - inputItems.length).fill(undefined),
      );
    } else if (inputItems.length > schemas.length) {
      if (this._def.rest) {
        schemas.push(
          ...Array(inputItems.length - schemas.length).fill(this._def.rest),
        );
      } else {
        z.addIssueToContext(ctx, {
          code: z.ZodIssueCode.too_big,
          maximum: schemas.length,
          inclusive: true,
          exact: false,
          type: "array",
        });
        status.dirty();
        inputItems.splice(schemas.length);
      }
    }
    const issues: z.ZodIssue[] = [];
    const results = inputItems.map((item, index) =>
      schemas[index]._parse({
        data: item,
        path: [...ctx.path, index],
        parent: { ...ctx, common: { ...ctx.common, issues } },
      }),
    );
    const postprocess = (
      results: z.SyncParseReturnType[],
    ): z.SyncParseReturnType => {
      // schemas:    [z.boolean(), z.number(), z.string().optional()]
      // ctx.data:   [true]
      // inputItems: [true,        undefined,  undefined            ]
      // results:    [z.OK(true),  z.INVALID,  z.OK(undefined)      ]
      //             └───────────────────────┘
      //              requiredInputLength = 2
      const requiredInputLength =
        ctx.data.length +
        results
          .slice(ctx.data.length)
          .findLastIndex((result) => !z.isValid(result)) +
        1;
      if (requiredInputLength > ctx.data.length) {
        z.addIssueToContext(ctx, {
          code: z.ZodIssueCode.too_small,
          minimum: requiredInputLength,
          inclusive: true,
          exact: false,
          type: "array",
        });
        return z.INVALID;
      }
      ctx.common.issues.push(...issues);
      const result = z.ParseStatus.mergeArray(status, results);
      if (z.isAborted(result)) {
        return result;
      }
      const outputItems = [...(result.value as unknown[])];
      if (outputItems.length === this._def.items.length) {
        outputItems.splice(
          outputItems.findLastIndex((item) => item !== undefined) + 1,
        );
      }
      return { ...result, value: outputItems };
    };
    return ctx.common.async
      ? Promise.all(results).then(postprocess)
      : postprocess(results as z.SyncParseReturnType[]);
  }

  get items() {
    return this._def.items;
  }

  rest<Rest extends z.ZodTypeAny>(rest: Rest): ZodTupleWithOptional<T, Rest> {
    return new ZodTupleWithOptional({ ...this._def, rest });
  }

  toTuple(): z.ZodTuple<T, Rest> {
    return new z.ZodTuple({
      ...this._def,
      typeName: z.ZodFirstPartyTypeKind.ZodTuple,
    });
  }

  static create<T extends z.ZodTupleItems | []>(
    schemas: T,
    params?: z.RawCreateParams,
  ): ZodTupleWithOptional<T> {
    return new ZodTupleWithOptional({
      items: schemas,
      rest: null,
      ...z.never(params)._def, // ...processCreateParams(params),
      typeName: "ZodTupleWithOptional",
    });
  }
}

export const tupleWithOptional = ZodTupleWithOptional.create;

const x = tupleWithOptional([z.string(), z.number().optional()]);
