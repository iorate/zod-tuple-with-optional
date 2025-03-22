import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { tupleWithOptional } from "./index.ts";

test("basic usage", () => {
  const schema = tupleWithOptional([
    z.boolean(),
    z.number(),
    z.string().optional(),
    z.number().optional(),
  ]);

  // Success cases
  const result1 = schema.safeParse([true, 1, "hello", 2]);
  assert.deepEqual(result1, {
    success: true,
    data: [true, 1, "hello", 2],
  });

  const result2 = schema.safeParse([true, 1, "hello"]);
  assert.deepEqual(result2, {
    success: true,
    data: [true, 1, "hello"],
  });

  const result3 = schema.safeParse([true, 1]);
  assert.deepEqual(result3, {
    success: true,
    data: [true, 1],
  });

  // Failure cases
  const result4 = schema.safeParse([true]);
  assert.equal(result4.success, false);
  if (!result4.success) {
    assert.deepEqual(
      result4.error.issues.map(({ code }) => code),
      ["too_small"],
    );
  }

  const result5 = schema.safeParse([true, 1, "hello", "world"]);
  assert.equal(result5.success, false);
  if (!result5.success) {
    assert.deepEqual(
      result5.error.issues.map(({ code }) => code),
      ["invalid_type"],
    );
  }

  const result6 = schema.safeParse([true, 1, "hello", 2, "world"]);
  assert.equal(result6.success, false);
  if (!result6.success) {
    assert.deepEqual(
      result6.error.issues.map(({ code }) => code),
      ["too_big"],
    );
  }

  const result7 = schema.safeParse([true, 1, "hello", "world", 2]);
  assert.equal(result7.success, false);
  if (!result7.success) {
    assert.deepEqual(
      result7.error.issues.map(({ code }) => code),
      ["too_big", "invalid_type"],
    );
  }
});

test("with rest schema", () => {
  const schema = tupleWithOptional([z.boolean(), z.number().optional()]).rest(
    z.string(),
  );

  // Success cases
  const result1 = schema.safeParse([true, 1, "hello"]);
  assert.deepEqual(result1, {
    success: true,
    data: [true, 1, "hello"],
  });

  const result2 = schema.safeParse([true]);
  assert.deepEqual(result2, {
    success: true,
    data: [true],
  });

  const result3 = schema.safeParse([true, 1]);
  assert.deepEqual(result3, {
    success: true,
    data: [true, 1],
  });

  const result4 = schema.safeParse([true, 1, "hello", "world"]);
  assert.deepEqual(result4, {
    success: true,
    data: [true, 1, "hello", "world"],
  });

  // Failure cases
  const result5 = schema.safeParse([true, "hello"]);
  assert.equal(result5.success, false);
  if (!result5.success) {
    assert.deepEqual(
      result5.error.issues.map(({ code }) => code),
      ["invalid_type"],
    );
  }

  const result6 = schema.safeParse([true, 1, "hello", 2]);
  assert.equal(result6.success, false);
  if (!result6.success) {
    assert.deepEqual(
      result6.error.issues.map(({ code }) => code),
      ["invalid_type"],
    );
  }
});

test("with default schema", () => {
  const schema = tupleWithOptional([
    z.boolean().default(true),
    z.number().default(1),
    z.string().default("hello"),
  ]);

  const result1 = schema.safeParse([]);
  assert.deepEqual(result1, {
    success: true,
    data: [true, 1, "hello"],
  });

  const result2 = schema.safeParse([false]);
  assert.deepEqual(result2, {
    success: true,
    data: [false, 1, "hello"],
  });

  const result3 = schema.safeParse([false, 2]);
  assert.deepEqual(result3, {
    success: true,
    data: [false, 2, "hello"],
  });

  const result4 = schema.safeParse([false, 2, "world"]);
  assert.deepEqual(result4, {
    success: true,
    data: [false, 2, "world"],
  });
});

test("type inference", () => {
  const schema1 = tupleWithOptional([
    z.boolean(),
    z.number(),
    z.string().optional(),
  ]);

  type Schema1Type = z.infer<typeof schema1>;
  // Using z.util.assertEqual to check type equality
  z.util.assertEqual<Schema1Type, [boolean, number, string?]>(true);

  const schema2 = tupleWithOptional([z.boolean(), z.number().optional()]).rest(
    z.string(),
  );

  type Schema2Type = z.infer<typeof schema2>;
  z.util.assertEqual<Schema2Type, [boolean, number?, ...string[]]>(true);

  const schema3 = tupleWithOptional([
    z.boolean().default(true),
    z.number().default(1),
    z.string().default("hello"),
  ]);

  type Schema3Type = z.infer<typeof schema3>;
  z.util.assertEqual<Schema3Type, [boolean, number, string]>(true);
});

test("compatibility with z.tuple()", async (t) => {
  // https://github.com/colinhacks/zod/blob/v3.24.2/src/__tests__/tuple.test.ts
  /*
  MIT License

  Copyright (c) 2020 Colin McDonnell

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  */

  const testTuple = tupleWithOptional([
    z.string(),
    z.object({ name: z.literal("Rudy") }),
    z.array(z.literal("blue")),
  ]);
  const testData = ["asdf", { name: "Rudy" }, ["blue"]];
  const badData = [123, { name: "Rudy2" }, ["blue", "red"]];

  await t.test("tuple inference", () => {
    const args1 = tupleWithOptional([z.string()]);
    const returns1 = z.number();
    const func1 = z.function(args1.toTuple(), returns1);
    type func1 = z.TypeOf<typeof func1>;
    z.util.assertEqual<func1, (k: string) => number>(true);
  });

  await t.test("successful validation", () => {
    const val = testTuple.parse(testData);
    assert.deepEqual(val, ["asdf", { name: "Rudy" }, ["blue"]]);
  });

  await t.test("successful async validation", async () => {
    const val = await testTuple.parseAsync(testData);
    return assert.deepEqual(val, testData);
  });

  await t.test("failed validation", () => {
    const checker = () => {
      testTuple.parse([123, { name: "Rudy2" }, ["blue", "red"]]);
    };
    try {
      checker();
    } catch (err) {
      if (err instanceof z.ZodError) {
        assert.equal(err.issues.length, 3);
      }
    }
  });

  await t.test("failed async validation", async () => {
    const res = await testTuple.safeParse(badData);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.equal(res.error.issues.length, 3);
    }
    // try {
    //   checker();
    // } catch (err) {
    //   if (err instanceof ZodError) {
    //     expect(err.issues.length).toEqual(3);
    //   }
    // }
  });

  await t.test("tuple with transformers", () => {
    const stringToNumber = z.string().transform((val) => val.length);
    const val = tupleWithOptional([stringToNumber]);

    type t1 = z.input<typeof val>;
    z.util.assertEqual<t1, [string]>(true);
    type t2 = z.output<typeof val>;
    z.util.assertEqual<t2, [number]>(true);
    assert.deepEqual(val.parse(["1234"]), [4]);
  });

  await t.test("tuple with rest schema", () => {
    const myTuple = tupleWithOptional([z.string(), z.number()]).rest(
      z.boolean(),
    );
    assert.deepEqual(myTuple.parse(["asdf", 1234, true, false, true]), [
      "asdf",
      1234,
      true,
      false,
      true,
    ]);

    assert.deepEqual(myTuple.parse(["asdf", 1234]), ["asdf", 1234]);

    assert.throws(() => myTuple.parse(["asdf", 1234, "asdf"]));
    type t1 = z.output<typeof myTuple>;

    z.util.assertEqual<t1, [string, number, ...boolean[]]>(true);
  });

  await t.test("parse should fail given sparse array as tuple", () => {
    assert.throws(() => testTuple.parse(new Array(3)));
  });

  await t.test("tuple with optional elements", () => {
    const result = tupleWithOptional([
      z.string(),
      z.number().optional(),
    ]).safeParse(["asdf"]);
    assert.deepEqual(result, { success: true, data: ["asdf"] });
  });
});
