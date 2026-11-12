import { isEnumType } from "graphql";
import { describe, expect, it } from "vitest";
import { loadSchema } from "./schema.ts";
import { VALUE_BUCKETS, valueBucketOf } from "./value-buckets.ts";

describe("VALUE_BUCKETS", () => {
  it("lists exactly the ValueBucket enum, in ascending order", () => {
    const e = loadSchema().getType("ValueBucket");
    if (!isEnumType(e)) throw new Error("no ValueBucket enum");
    expect(VALUE_BUCKETS.map((b) => b.bucket)).toEqual(e.getValues().map((v) => v.name));
    const edges = VALUE_BUCKETS.flatMap((b) => (b.upToBani === null ? [] : [BigInt(b.upToBani)]));
    expect(edges).toEqual([...edges].sort((a, b) => (a < b ? -1 : 1)));
    expect(VALUE_BUCKETS.at(-1)!.upToBani).toBeNull();
  });
  it("puts a value exactly on an edge in the lower bucket", () => {
    expect(valueBucketOf("0")).toBe("UP_TO_10K");
    expect(valueBucketOf("1000000")).toBe("UP_TO_10K");
    expect(valueBucketOf("1000001")).toBe("UP_TO_135K");
  });
  it("places the statutory caps", () => {
    expect(valueBucketOf("13506000")).toBe("UP_TO_135K"); // 135,060 RON: at the old cap
    expect(valueBucketOf("13506001")).toBe("UP_TO_270K");
    expect(valueBucketOf("27012000")).toBe("UP_TO_270K");
    expect(valueBucketOf("90040001")).toBe("UP_TO_9M");
    expect(valueBucketOf("100000000001")).toBe("OVER_1B");
  });
  it("has no bucket for a record with no value", () => {
    expect(valueBucketOf(null)).toBeNull();
  });
});
