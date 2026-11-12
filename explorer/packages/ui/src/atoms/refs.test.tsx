import { createRef, type ReactElement, type Ref } from "react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../testing/render.tsx";
import {
  Box, Button, Card, CardActions, CardContent, CardHeader, Chip, Grid, IconButton, LinearProgress, Link, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
} from "./index.ts";

// A wrapper that dropped `ref` would still pass every prop test; this proves each one forwards it.
type Case = [name: string, element: (ref: Ref<never>) => ReactElement, expected: (el: HTMLElement) => boolean];

const tag = (name: string) => (el: HTMLElement) => el.tagName === name;

const cases: Case[] = [
  ["Box", (ref) => <Box ref={ref}>x</Box>, tag("DIV")],
  ["Button", (ref) => <Button ref={ref}>x</Button>, tag("BUTTON")],
  ["Card", (ref) => <Card ref={ref}>x</Card>, tag("DIV")],
  ["CardActions", (ref) => <CardActions ref={ref} />, tag("DIV")],
  ["CardContent", (ref) => <CardContent ref={ref}>x</CardContent>, tag("DIV")],
  ["CardHeader", (ref) => <CardHeader ref={ref} title="x" />, tag("DIV")],
  ["Chip", (ref) => <Chip ref={ref} label="x" />, tag("DIV")],
  ["Grid", (ref) => <Grid ref={ref} container>x</Grid>, tag("DIV")],
  ["IconButton", (ref) => <IconButton ref={ref} aria-label="x" />, tag("BUTTON")],
  ["IconButton as link", (ref) => <IconButton ref={ref} aria-label="x" href="/x" />, tag("A")],
  ["LinearProgress", (ref) => <LinearProgress ref={ref} variant="determinate" value={10} />, tag("SPAN")],
  ["Link", (ref) => <Link ref={ref} href="/x">x</Link>, tag("A")],
  ["Stack", (ref) => <Stack ref={ref}>x</Stack>, tag("DIV")],
  ["Tab", (ref) => <Tabs value="a"><Tab ref={ref} value="a" label="x" /></Tabs>, tag("BUTTON")],
  ["Table", (ref) => <Table ref={ref} />, tag("TABLE")],
  ["TableBody", (ref) => <table><TableBody ref={ref} /></table>, tag("TBODY")],
  ["TableCell", (ref) => <table><tbody><tr><TableCell ref={ref}>x</TableCell></tr></tbody></table>, tag("TD")],
  ["TableContainer", (ref) => <TableContainer ref={ref} />, tag("DIV")],
  ["TableHead", (ref) => <table><TableHead ref={ref} /></table>, tag("THEAD")],
  [
    "TablePagination",
    (ref) => (
      <table><tbody><tr><TablePagination ref={ref} count={1} page={0} rowsPerPage={10} onPageChange={() => {}} /></tr></tbody></table>
    ),
    tag("TD"),
  ],
  ["TableRow", (ref) => <table><tbody><TableRow ref={ref} /></tbody></table>, tag("TR")],
  ["Tabs", (ref) => <Tabs ref={ref} value={false} />, tag("DIV")],
  ["TextField", (ref) => <TextField ref={ref} label="x" />, (el) => el.querySelector("input") !== null],
  ["Tooltip", (ref) => <Tooltip ref={ref} title="t"><button>x</button></Tooltip>, tag("BUTTON")],
  ["Tooltip on a disabled child", (ref) => <Tooltip ref={ref} title="t"><button disabled>x</button></Tooltip>, tag("SPAN")],
  ["Typography", (ref) => <Typography ref={ref}>x</Typography>, tag("P")],
];

describe("every atom forwards its ref to the element it renders", () => {
  it.each(cases)("%s", (_name, element, expected) => {
    const ref = createRef<HTMLElement>();
    renderInUi(element(ref as Ref<never>));
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(expected(ref.current!)).toBe(true);
  });
});
