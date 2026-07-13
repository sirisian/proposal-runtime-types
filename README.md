# Runtime Types

An optional static type system for ECMAScript whose types are checked and enforced **at run time**.

You can browse the [rendered specification](https://sirisian.github.io/proposal-runtime-types/) or its [source](https://github.com/sirisian/proposal-runtime-types/blob/HEAD/spec.emu). The full design, including the rationale, the complete set of extensions, and worked examples, lives in the [design repository](https://github.com/sirisian/ecmascript-types).

- **Stage:** 0
- **Champion:** *seeking a TC39 delegate to champion this proposal*
- **Author:** Sirisian

## Motivation

This proposal adds an optional static type system to ECMAScript whose types are real at run time. A typed binding enforces its type on assignment, conversions between numeric types are written explicitly instead of happening silently, and a value's type is available through reflection. The annotations are optional and additive, so a program keeps its current meaning until it opts in.

The aim is the precision and performance a value-type discipline gives systems languages. Sized numerics that never silently widen, structs with a defined memory layout that pack into contiguous arrays, operator overloading, and generics specialized by monomorphization are all available where a program asks for them.

JavaScript already has a typing proposal before committee, [type annotations](https://github.com/tc39/proposal-type-annotations), which take the opposite approach: the annotations are erasable, ignored by the engine and checked only by external tools such as TypeScript. This proposal is the complementary direction. One keeps types out of the runtime, and this one brings them in. Both are optional, and a program can adopt either.

## A taste

Sized numerics do not implicitly widen, so conversions are explicit and checked:

```js
let a: uint32 = 1;
let b: uint8 = a;        // TypeError: no implicit conversion from uint32 to uint8
let c: uint8 = uint8(a); // explicit, and range-checked at run time
```

Value-type classes have a defined layout, so an array of them is one contiguous buffer rather than a thousand heap objects:

```js
class Vector3 {
  x: float32;
  y: float32;
  z: float32;
}
const points: [1000].<Vector3>; // 12000 contiguous bytes
Vector3.byteLength;             // 12
```

Types are first-class, interned values, so equal types are the same value and a `Map` can be keyed on one:

```js
uint8 === uint8;             // true
[].<uint8> === [].<uint8>;   // true
const registry = new Map.<type, unknown>();
registry.set(Vector3, descriptorFor(Vector3));
```

Operators can be overloaded on a class, and the arithmetic reads as arithmetic:

```js
class Vector3 {
  x: float32; y: float32; z: float32;
  operator+(rhs: Vector3): Vector3 {
    return { x: this.x + rhs.x, y: this.y + rhs.y, z: this.z + rhs.z } := Vector3;
  }
}
const c = a + b; // calls operator+
```

## What it includes

The core type system covers typed bindings and destructuring, sized integer/float/decimal types (plus `rational`, `complex`, and arbitrary-width `int.<N>`), value-type and reference-type classes, interfaces, enums, function and operator overloading, union/intersection/tuple types, and types as reflectable values. A set of layered extensions covers SIMD, generics, decorators and reflection metadata, dimensioned primitives, ranges, structure-of-arrays storage, memory layout, references and borrowing, and more. Each is written up in full in the [design repository](https://github.com/sirisian/ecmascript-types).

## Status

This repository holds the formal specification, which is being written in phases against the design. The phased plan, which starts from this infrastructure and builds up the type-checking framework, the type universe, and the feature clauses in dependency order, is described in the design repository's specification plan. Feedback, issues, and prospective champions are welcome.

The specification is authored in [ecmarkup](https://github.com/tc39/ecmarkup). To build it locally:

```sh
npm install
npm run build   # produces build/index.html
```
