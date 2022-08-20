# Schemastery-JSONSchema

This library converts schemastery definition to JSONSchema.

usage:

```ts
import convert from 'schemastery-jsonschema';
import Schema from 'schemastery';

const schema = Schema.object({
  foo: Schema.string(),
});
console.log(convert(schema));
```
