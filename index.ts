import { JSONSchema7Definition } from 'json-schema';
import Schema from 'schemastery';

type JSONSchema7 = Exclude<JSONSchema7Definition, boolean>;

function getBaseSchema(def: Schema.Base, allowUnsafe): JSONSchema7 {
    switch (def.type) {
        case 'string':
            return {
                type: 'string',
                pattern: def.meta?.pattern?.source,
            };
        case 'number':
            return {
                type: 'number',
                maximum: def.meta?.max,
                minimum: def.meta?.min,
            };
        case 'boolean':
            return { type: 'boolean' };
        case 'any':
            return {};
        case 'never':
            return { type: 'boolean', const: 1 };
        case 'const':
            return { const: def.value };
        case 'object':
            return {
                type: 'object',
                properties: Object.fromEntries(Object.entries(def.dict || {}).map((i) => [i[0], { $ref: `#/definitions/${i[1]}` }])),
            };
        case 'dict':
            if (!allowUnsafe) throw new Error('dict is unsafe, set allowUnsafe=true to ignore.');
            return {
                type: 'object',
                patternProperties: { '^.*$': { $ref: `#/definitions/${def.inner}` } },
                additionalProperties: false,
            };
        case 'array':
            return {
                type: 'array',
                items: { $ref: `#/definitions/${def.inner}` },
            };
        case 'union':
            return {
                anyOf: def.list?.map((inner) => ({ $ref: `#/definitions/${inner}` })),
            };
        case 'intersect':
            return {
                allOf: def.list?.map((inner) => ({ $ref: `#/definitions/${inner}` })),
            };
        default: {
            throw new Error('Not implemented');
        }
    }
}

function convertDef(def: Schema<any, any>, allowUnsafe = false): JSONSchema7 {
    const baseSchema = getBaseSchema(def, allowUnsafe);
    baseSchema.default = def.meta?.default;
    if (!def.meta?.required) {
        return { oneOf: [baseSchema, { type: 'null' }] };
    }
    return baseSchema;
}

function getAllRefs(def: Schema.Base) {
    const refs = { ...def.refs };
    if (def.list?.length) {
        for (let i = 0; i < def.list.length; i++) {
            if (typeof def.list[i] === 'number') continue;
            Object.assign(refs, getAllRefs(def.list[i]));
            def.list[i] = def.list[i].uid as any;
        }
    }
    if (def.dict) {
        for (const [key, inner] of Object.entries(def.dict)) {
            if (typeof inner === 'number') continue;
            Object.assign(refs, getAllRefs(inner));
            def.dict[key] = inner.uid as any;
        }
    }
    if (def.refs) {
        Object.values(def.refs).forEach((node) => {
            Object.assign(refs, getAllRefs(node))
        })
    }
    return refs;
}

export default function convert(schema: Schema<any, any> | Schema<never, never>, allowUnsafe: boolean = false): JSONSchema7 {
    const rootSchema = schema.toJSON();
    const refs = getAllRefs(rootSchema);
    const root = convertDef(refs[rootSchema.uid]!, allowUnsafe);
    delete refs[rootSchema.uid];
    delete root.default; // ajv strict mode: default is ignored in the schema root
    const defs = {};
    for (const key in refs) defs[key] = convertDef(refs[key]!, allowUnsafe);
    root.definitions = defs;
    return root;
}
