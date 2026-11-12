import {
  getNamedType, isAbstractType, isEnumType, isListType, isNonNullType, isObjectType, isScalarType,
  Kind, getVariableValues,
  type DocumentNode, type FragmentDefinitionNode, type GraphQLOutputType, type GraphQLSchema,
  type OperationDefinitionNode, type SelectionSetNode, type GraphQLObjectType,
} from "graphql";
import { fragmentMap, operationDefinitions, selfContained } from "./operations.ts";

/**
 * Checks that `data` is exactly the response `document`'s operation would produce:
 * every selected key present, no unselected key, null only where the schema allows it,
 * enums and custom scalars valid, union members told apart by `__typename`.
 * Also checks `variables` against the operation's variable definitions.
 * Returns a list of problems (empty means valid).
 */
export function validateResponse(
  schema: GraphQLSchema,
  document: DocumentNode,
  data: unknown,
  variables: Record<string, unknown> = {},
): string[] {
  const [op] = operationDefinitions(document);
  if (!op) return ["document has no operation"];
  const fragments = fragmentMap(document);
  const errors: string[] = [];

  const vars = getVariableValues(schema, [...(op.variableDefinitions ?? [])], variables);
  if (vars.errors) for (const e of vars.errors) errors.push(`variables: ${e.message}`);

  const root = schema.getQueryType();
  if (!root) return ["schema has no Query type"];
  walkObject(schema, fragments, root, op.selectionSet, data, "", errors);
  return errors;
}

/** Same, for one operation of a larger document (fragments resolved from it). */
export function validateOperationResponse(
  schema: GraphQLSchema,
  all: DocumentNode,
  op: OperationDefinitionNode,
  data: unknown,
  variables: Record<string, unknown>,
): string[] {
  return validateResponse(schema, selfContained(op, fragmentMap(all)), data, variables);
}

type Fragments = Map<string, FragmentDefinitionNode>;

interface Collected {
  responseKey: string;
  fieldName: string;
  selections: SelectionSetNode[];
}

/** Fields of `set` that apply to the concrete object type, merged by response key. */
function collect(schema: GraphQLSchema, fragments: Fragments, type: GraphQLObjectType, set: SelectionSetNode, into = new Map<string, Collected>()) {
  for (const sel of set.selections) {
    if (sel.kind === Kind.FIELD) {
      const key = sel.alias?.value ?? sel.name.value;
      const entry = into.get(key) ?? { responseKey: key, fieldName: sel.name.value, selections: [] };
      if (sel.selectionSet) entry.selections.push(sel.selectionSet);
      into.set(key, entry);
    } else {
      const cond = sel.kind === Kind.INLINE_FRAGMENT ? sel.typeCondition?.name.value : fragments.get(sel.name.value)?.typeCondition.name.value;
      const body = sel.kind === Kind.INLINE_FRAGMENT ? sel.selectionSet : fragments.get(sel.name.value)?.selectionSet;
      if (!body) continue;
      const condType = cond ? schema.getType(cond) : type;
      const applies = !condType || condType === type || (isAbstractType(condType) && schema.isSubType(condType, type));
      if (applies) collect(schema, fragments, type, body, into);
    }
  }
  return into;
}

function walkObject(schema: GraphQLSchema, fragments: Fragments, type: GraphQLObjectType, set: SelectionSetNode, value: unknown, path: string, errors: string[]) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push(`${path || "data"}: expected an object`);
    return;
  }
  const record = value as Record<string, unknown>;
  const fields = collect(schema, fragments, type, set);
  for (const f of fields.values()) {
    const at = path ? `${path}.${f.responseKey}` : f.responseKey;
    if (!(f.responseKey in record)) {
      errors.push(`${at}: missing`);
      continue;
    }
    if (f.fieldName === "__typename") {
      if (record[f.responseKey] !== type.name) errors.push(`${at}: expected ${type.name}`);
      continue;
    }
    const field = type.getFields()[f.fieldName];
    if (!field) {
      errors.push(`${at}: no such field ${type.name}.${f.fieldName}`);
      continue;
    }
    walkValue(schema, fragments, field.type, f.selections, record[f.responseKey], at, errors);
  }
  for (const key of Object.keys(record)) if (!fields.has(key)) errors.push(`${path ? path + "." : ""}${key}: not selected by the operation`);
}

function walkValue(schema: GraphQLSchema, fragments: Fragments, type: GraphQLOutputType, selections: SelectionSetNode[], value: unknown, path: string, errors: string[]) {
  if (isNonNullType(type)) {
    if (value === null || value === undefined) {
      errors.push(`${path}: null in a non-null field`);
      return;
    }
    return walkValue(schema, fragments, type.ofType, selections, value, path, errors);
  }
  if (value === null) return;
  if (value === undefined) {
    errors.push(`${path}: undefined`);
    return;
  }
  if (isListType(type)) {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected a list`);
      return;
    }
    value.forEach((item, i) => walkValue(schema, fragments, type.ofType as GraphQLOutputType, selections, item, `${path}[${i}]`, errors));
    return;
  }
  const named = getNamedType(type);
  if (isScalarType(named)) {
    try {
      named.serialize(value);
      if (named.name === "String" && typeof value !== "string") throw new TypeError("not a string");
      if (named.name === "Int" && !Number.isInteger(value)) throw new TypeError("not an integer");
      if (named.name === "Float" && typeof value !== "number") throw new TypeError("not a number");
      if (named.name === "Boolean" && typeof value !== "boolean") throw new TypeError("not a boolean");
      if (named.name === "ID" && typeof value !== "string") throw new TypeError("not a string");
    } catch (e) {
      errors.push(`${path}: ${named.name}: ${(e as Error).message}`);
    }
    return;
  }
  if (isEnumType(named)) {
    if (typeof value !== "string" || !named.getValue(value)) errors.push(`${path}: ${JSON.stringify(value)} is not a ${named.name}`);
    return;
  }
  const merged: SelectionSetNode = { kind: Kind.SELECTION_SET, selections: selections.flatMap((s) => s.selections) };
  if (isObjectType(named)) return walkObject(schema, fragments, named, merged, value, path, errors);
  // abstract: the concrete member comes from __typename, which the fixture must carry.
  const typename = (value as Record<string, unknown>)?.__typename;
  const concrete = typeof typename === "string" ? schema.getType(typename) : undefined;
  if (!isObjectType(concrete) || !schema.isSubType(named as never, concrete)) {
    errors.push(`${path}: needs a __typename naming a member of ${named.name}`);
    return;
  }
  walkObject(schema, fragments, concrete, merged, value, path, errors);
}

