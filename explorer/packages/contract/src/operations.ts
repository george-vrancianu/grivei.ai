import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Kind, parse, print, visit,
  type DocumentNode, type FragmentDefinitionNode, type OperationDefinitionNode,
} from "graphql";
import { operationsDir } from "./paths.ts";

export interface PersistedOperation {
  name: string;
  /** sha256 of `document`, hex. The client sends this; the server looks the document up. */
  sha256: string;
  /** The operation with every fragment it uses, printed canonically. */
  document: string;
}

/** Every definition from operations/*.graphql, in file-name order. */
export function loadDefinitions(dir = operationsDir): DocumentNode {
  const files = readdirSync(dir).filter((f) => f.endsWith(".graphql")).sort();
  const definitions = files.flatMap((f) => parse(readFileSync(join(dir, f), "utf8"), { noLocation: true }).definitions);
  return { kind: Kind.DOCUMENT, definitions };
}

export function operationDefinitions(doc: DocumentNode): OperationDefinitionNode[] {
  return doc.definitions.filter((d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION);
}

export function fragmentMap(doc: DocumentNode): Map<string, FragmentDefinitionNode> {
  const map = new Map<string, FragmentDefinitionNode>();
  for (const d of doc.definitions) if (d.kind === Kind.FRAGMENT_DEFINITION) map.set(d.name.value, d);
  return map;
}

/** The operation plus the transitive closure of the fragments it spreads, sorted by name. */
export function selfContained(op: OperationDefinitionNode, fragments: Map<string, FragmentDefinitionNode>): DocumentNode {
  const used = new Map<string, FragmentDefinitionNode>();
  const collect = (node: OperationDefinitionNode | FragmentDefinitionNode) => {
    visit(node, {
      FragmentSpread(spread) {
        const name = spread.name.value;
        if (used.has(name)) return;
        const frag = fragments.get(name);
        if (!frag) throw new Error(`operation ${op.name?.value} spreads unknown fragment ${name}`);
        used.set(name, frag);
        collect(frag);
      },
    });
  };
  collect(op);
  const sorted = [...used.values()].sort((a, b) => a.name.value.localeCompare(b.name.value));
  return { kind: Kind.DOCUMENT, definitions: [op, ...sorted] };
}

export function persistedOperations(doc = loadDefinitions()): PersistedOperation[] {
  const fragments = fragmentMap(doc);
  const seen = new Set<string>();
  return operationDefinitions(doc)
    .map((op) => {
      const name = op.name?.value;
      if (!name) throw new Error("every operation must be named");
      if (seen.has(name)) throw new Error(`duplicate operation name ${name}`);
      seen.add(name);
      const document = print(selfContained(op, fragments));
      return { name, sha256: createHash("sha256").update(document).digest("hex"), document };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface Allowlist {
  version: 1;
  operations: PersistedOperation[];
}

export function buildAllowlist(): Allowlist {
  return { version: 1, operations: persistedOperations() };
}
