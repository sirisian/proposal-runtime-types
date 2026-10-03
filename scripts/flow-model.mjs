import { writeFile } from 'node:fs/promises';

// Independent bounded model of #sec-checking-state and #sec-checking-transfer-composition.
// A state is a set of Boolean valuations. Joins deliberately forget correlations;
// the tested expressions read one binding, so no relational solver is implied.
const all = [{ x:false, y:false }, { x:false, y:true }, { x:true, y:false }, { x:true, y:true }];
const expressions = [
  ['x', (s) => s.x], ['!x', (s) => !s.x], ['y', (s) => s.y], ['!y', (s) => !s.y],
  ['x && y', (s) => s.x && s.y], ['x || y', (s) => s.x || s.y],
  ['!x && y', (s) => !s.x && s.y], ['!x || y', (s) => !s.x || s.y],
];
const tests = expressions.slice(0, 4);
const joinValuations = (states) => all.filter((candidate) => ['x', 'y']
  .every((key) => states.some((state) => candidate[key] === state[key])));
const contexts = {
  if: (e) => `if (${e}) {}`,
  conditional: (e) => `void (${e} ? 1 : 0);`,
  while: (e) => `while (${e}) { break; }`,
  for: (e) => `for (; ${e};) { break; }`,
  do: (e) => `do { void 0; } while (${e});`,
};

export function booleanFlowCases() {
  const cases = [];
  for (const [outerIndex, [outer, evaluate]] of expressions.entries()) {
    for (const branch of [true, false]) {
      const incoming = joinValuations(all.filter((state) => evaluate(state) === branch));
      for (const [innerIndex, [inner, observe]] of tests.entries()) {
        const answers = new Set(incoming.map(observe));
        const rejecting = incoming.length > 0 && answers.size === 1;
        for (const [context, render] of Object.entries(contexts)) {
          const body = branch ? `if (${outer}) { ${render(inner)} }` : `if (${outer}) {} else { ${render(inner)} }`;
          cases.push({
            id:`boolean-${outerIndex}-${branch ? 'true' : 'false'}-${innerIndex}-${context}`,
            source:`function f(x: boolean, y: boolean) { ${body} }`,
            uncheckedSource:`function f(x, y) { ${body} }`,
            expected:rejecting ? 'reject' : 'accept',
            rules:rejecting ? ['rt-constant-condition', 'rt-impossible-test'] : [],
          });
        }
      }
    }
  }
  return cases;
}

const corpus = {
  schemaVersion:1,
  specification:['sec-checking-state','sec-checking-transfer-composition'],
  coverage:'Two Boolean bindings; pure short-circuit guards; product-domain joins of guard alternatives; atomic deciding uses in five control forms. No mutation, abrupt completions, metadata, references, module scheduling, or numeric domains are modeled.',
  cases:booleanFlowCases(),
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(corpus, null, 2)+'\n');
console.log(`${corpus.cases.length} independently derived flow cases; ${corpus.cases.filter((c) => c.expected === 'reject').length} rejections.`);
