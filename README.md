# zod-tuple-with-optional

A [Zod](https://github.com/colinhacks/zod) extension that provides tuple validation with support for trailing optional elements.

## Installation

```bash
npm install zod-tuple-with-optional
```

## Motivation

Zod's native `z.tuple()` doesn't support optional elements ([issue](https://github.com/colinhacks/zod/issues/149)). This library provides a `tupleWithOptional()` function that lets you define tuples with optional trailing elements.

## Usage

### Basic Usage

Define tuples with required and optional elements:

```typescript
import { z } from 'zod';
import { tupleWithOptional } from 'zod-tuple-with-optional';

// Create tuple schema with optional trailing elements
const schema = tupleWithOptional([
  z.boolean(),           // required
  z.number(),            // required
  z.string().optional(), // optional
  z.number().optional()  // optional
]);

// These all pass validation
schema.parse([true, 1, "hello", 2]);   // [true, 1, "hello", 2]
schema.parse([true, 1, "hello"]);      // [true, 1, "hello"]
schema.parse([true, 1]);               // [true, 1]

// These fail validation
schema.parse([true]);                  // Error: Too few elements
schema.parse([true, 1, "hello", "world"]); // Error: Invalid type for 4th element
schema.parse([true, 1, "hello", 2, 5]);    // Error: Too many elements
```

### With Rest Schema

You can also specify a rest schema to handle additional elements:

```typescript
const schema = tupleWithOptional([
  z.boolean(),           // required
  z.number().optional()  // optional
]).rest(z.string());

// These all pass validation
schema.parse([true, 1, "hello"]);         // [true, 1, "hello"]
schema.parse([true]);                     // [true]
schema.parse([true, 1]);                  // [true, 1]
schema.parse([true, 1, "hello", "world"]); // [true, 1, "hello", "world"]

// These fail validation
schema.parse([true, "hello"]);            // Error: Invalid type for 2nd element
schema.parse([true, 1, "hello", 2]);      // Error: Invalid type for 4th element
```

### With Default Schema

You can provide default values for elements in your tuple:

```typescript
const schema = tupleWithOptional([
  z.boolean().default(true),
  z.number().default(1),
  z.string().default("hello")
]);

schema.parse([]);                   // [true, 1, "hello"]
schema.parse([false]);              // [false, 1, "hello"]
schema.parse([false, 2]);           // [false, 2, "hello"]
schema.parse([false, 2, "world"]);  // [false, 2, "world"]
```

### Type Inference

TypeScript types are inferred correctly:

```typescript
const schema1 = tupleWithOptional([
  z.boolean(),
  z.number(),
  z.string().optional(),
]);

type Schema1Type = z.infer<typeof schema1>;
// Type: [boolean, number, string?]

const schema2 = tupleWithOptional([
  z.boolean(),
  z.number().optional(),
]).rest(z.string());

type Schema2Type = z.infer<typeof schema2>;
// Type: [boolean, number?, ...string[]]

const schema3 = tupleWithOptional([
  z.boolean().default(true),
  z.number().default(1),
  z.string().default("hello"),
]);

type Schema3Type = z.infer<typeof schema3>;
// Type: [boolean, number, string]
```

## License

MIT
