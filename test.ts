import Ajv from 'ajv';
import { expect } from 'chai';
import { cloneDeep } from 'lodash-es';
import Schema from 'schemastery';
// @ts-ignore
import convert from './index.ts';

const ajv = new Ajv({ useDefaults: true });
type AnySchema = Schema | Schema<never, never>;

const check = (schema: AnySchema, value: any) => ajv.validate(convert(schema, true), value);
const test = (schema: AnySchema, value: any) => {
    const info = `
        Schema: ${schema.toString()}
        JSON: ${JSON.stringify(schema.toJSON())}
        convert: ${JSON.stringify(convert(schema, true))}
    `;
    try {
        schema(value as never);
    } catch (e) {
        expect(check(schema, value), info).to.equal(false);
        return;
    }
    expect(check(schema, value), info).to.equal(true);

    const extended = Schema.object({ foo: schema });
    const data = cloneDeep({ foo: value });
    ajv.validate(convert(extended, true), data);
    const extendedinfo = `
        Schema: ${extended.toString()}
        JSON: ${JSON.stringify(extended.toJSON())}
        convert: ${JSON.stringify(convert(extended, true))}
        ajv: ${JSON.stringify(data)}
        original: ${JSON.stringify({ foo: value })}
        schemastery: ${JSON.stringify(extended({ foo: value }))}
    `;
    expect(data, extendedinfo).to.deep.equal(extended({ foo: value }));
};

describe('test', () => {
    it('string', () => {
        test(Schema.string(), 'foo');
        test(Schema.string(), 0);
        test(Schema.string(), true);

        // FIXME this should pass validation
        // test(Schema.string().default('foo'), undefined);

        test(Schema.string().pattern(/fo+/), 'foo');
        test(Schema.string().pattern(/fo+/), 'bar');
    });

    it('number', () => {
        test(Schema.number(), 0);
        test(Schema.number(), 'foo');
        test(Schema.number(), true);

        test(Schema.number().max(10).min(0), 0);
        test(Schema.number().max(10).min(0), 5);
        test(Schema.number().max(10).min(0), 10);
        test(Schema.number().max(10).min(0), -1);
    });

    it('boolean', () => {
        test(Schema.boolean(), false);
        test(Schema.boolean(), 'foo');
        test(Schema.boolean(), 0);
    });

    it('any', () => {
        test(Schema.any(), 'foo');
        test(Schema.any(), 0);
        test(Schema.any(), true);
    });

    it('never', () => {
        test(Schema.never(), false);
        test(Schema.never(), 'foo');
        test(Schema.never(), 0);
    });

    it('const', () => {
        test(Schema.const('foo'), 'foo');
        test(Schema.const('foo'), 'bar');
    });

    it('object', () => {
        test(Schema.object({ foo: Schema.string() }), { foo: 'bar' });
        test(Schema.object({ foo: Schema.string() }), { foo: 0 });
    });

    it('dict', () => {
        test(Schema.dict(Schema.string()), { foo: 'bar' });
        test(Schema.dict(Schema.string()), { foo: 0 });
    });

    it('array', () => {
        test(Schema.array(Schema.string()), { foo: 'bar' });
        test(Schema.array(Schema.string()), ['foo']);
        test(Schema.array(Schema.string()), [0]);
        test(Schema.array(Schema.string()), 'foo');
    });

    it('union', () => {
        test(Schema.union([Schema.string(), Schema.number()]), 'foo');
        test(Schema.union([Schema.string(), Schema.number()]), 0);
        test(Schema.union([Schema.string(), Schema.number()]), true);
    });

    it('intersect', () => {
        test(Schema.intersect([Schema.string(), Schema.const('foo')]), 'foo');
        test(Schema.intersect([Schema.string(), Schema.number()]), 0);
    });
});
