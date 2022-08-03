interface WildcardPattern {
  kind: 'wildcard';
}

interface OrPattern {
  kind: 'or';
  left: Pattern;
  right: Pattern;
}

interface ConstructorPattern {
  kind: 'constructor';
  enum: string;
  constructor: string;
  data: Pattern[];
}

type Pattern = WildcardPattern | OrPattern | ConstructorPattern;
type Matrix = [Pattern[], number][];

interface Constructor {
  enum: string;
  variant: string;
  arity: number;
}

const wildcard: WildcardPattern = { kind: 'wildcard' };

/**
 * Specializes matrix `M` by constructor `c`.
 */
function S(c: Constructor, M: Matrix): Matrix {
  let result: Matrix = [];

  for (const row of M) {
    const pats = row[0];
    const pat = pats[0];
    const k = row[1];
    if (pat.kind === 'wildcard') {
      result.push([[...(Array(c.arity).fill(wildcard) as Pattern[]), ...pats.slice(1)], k]);
    } else if (pat.kind === 'or') {
      result.push(S(c, [[[pat.left, ...pats.slice(1)], k]])[0]);
      result.push(S(c, [[[pat.right, ...pats.slice(1)], k]])[0]);
    } else if (pat.kind === 'constructor' && pat.constructor === c.variant) {
      result.push([[...pat.data, ...pats.slice(1)], k]);
    } else {
      continue;
    }
  }

  return result;
}

/**
 * Computes the default matrix for matrix `M`.
 */
function D(M: Matrix): Matrix {
  let result: Matrix = [];
  for (const row of M) {
    const pats = row[0];
    const pat = pats[0];
    const k = row[1];
    if (pat.kind === 'wildcard') {
      result.push([[...pats.slice(1)], k]);
    } else if (pat.kind === 'or') {
      result.push(D([[[pat.left, ...pats.slice(1)], k]])[0]);
      result.push(D([[[pat.right, ...pats.slice(1)], k]])[0]);
    } else {
      continue;
    }
  }
  return result;
}

const empty_array_pat: ConstructorPattern = {
  kind: 'constructor',
  enum: 'List',
  constructor: '[]',
  data: [],
};

const concat_pat: ConstructorPattern = {
  kind: 'constructor',
  enum: 'List',
  constructor: '::',
  data: [
    wildcard,
    wildcard,
  ],
};

const false_pat: ConstructorPattern = {
  kind: 'constructor',
  enum: 'Bool',
  constructor: 'False',
  data: [],
};

const true_pat: ConstructorPattern = {
  kind: 'constructor',
  enum: 'Bool',
  constructor: 'True',
  data: [],
};

const red_pat: ConstructorPattern = {
  kind: 'constructor',
  enum: 'Color',
  constructor: 'Red',
  data: [],
};

const green_pat: ConstructorPattern = {
  kind: 'constructor',
  enum: 'Color',
  constructor: 'Green',
  data: [],
};

const blue_pat: ConstructorPattern = {
  kind: 'constructor',
  enum: 'Color',
  constructor: 'Blue',
  data: [],
};

const p = (p: string): Pattern => {
  switch (p) {
    case '_':
      return wildcard;
    case '[]':
      return empty_array_pat;
    case '_::_':
      return concat_pat;
    case 'True':
      return true_pat;
    case 'False':
      return false_pat;
    case 'Red':
      return red_pat;
    case 'Green':
      return green_pat;
    case 'Blue':
      return blue_pat;
  }
  throw new Error(`Pattern not supported ${p}`);
};

const ppp = (p: Pattern): string => {
  if (p.kind === 'wildcard') {
    return '_';
  } else if (p.kind === 'or') {
    return `(${ppp(p.left)}|${ppp(p.right)})`;
  }
  if (p.constructor === '::') {
    return `${ppp(p.data[0])}::${ppp(p.data[1])}`;
  }
  return p.constructor;
};

const ppM = (M: Matrix): string => {
  let output = '';
  for (const row of M) {
    output += row[0].map(ppp).join('\t');
    output += `\t→ ${row[row.length - 1]}\n`;
  }
  return output.trim();
};

const M: Matrix = [
  [[ p('[]'),   p('_')    ], 1 ],
  [[ p('_'),    p('[]')   ], 2 ],
  [[ p('_::_'), p('_::_') ], 3],
];

//console.log('Matrix');
//console.log(ppM(M));
//console.log();
//
//console.log('S([], Matrix)');
//console.log(ppM(S({ variant: '[]', arity: 0}, M)));
//console.log();
//
//console.log('S((::), Matrix)');
//console.log(ppM(S({ variant: '::', arity: 2}, M)));
//
//console.log();
//console.log('DefaultMatrix');
//console.log(ppM(D(M)));
//
//console.log();
//console.log('D(Q → B)');
//console.log(ppM(D([
//  [p('[]'), p('_'), 1],
//  [p('_'), p('[]'), 2],
//  [p('_'), p('_'), 3],
//])));

interface FailNode {
  kind: 'fail';
}

interface LeafNode {
  kind: 'leaf';
  k: number;
}

interface DefaultTest {
  kind: 'default';
}

type SwitchClauseList = [(Constructor | DefaultTest), Tree][];

interface SwitchNode {
  kind: 'switch';
  L: SwitchClauseList;
}

interface SwapNode {
  kind: 'swap';
  i: number;
  tree: Tree;
}

type Tree = FailNode | LeafNode | SwitchNode | SwapNode;

const fail: Tree = { kind: 'fail' };
const leaf = (k: number): Tree => ({ kind: 'leaf', k });

const ctr = (p: ConstructorPattern): Constructor => ({
  enum: p.enum,
  variant: p.constructor,
  arity: p.data.length,
});

function CC(M: Matrix): Tree {
  // If there are no rows, compilation fails
  if (M.length === 0) return fail;

  const first_row = M[0];

  // If there are no columns, or the first row consists of exclusively wildcards,
  // select the first action.
  let all_wildcards = true;
  for (const pat of first_row[0]) {
    if (pat.kind !== 'wildcard') {
      all_wildcards = false;
      break;
    }
  }
  if (all_wildcards) return leaf(first_row[1]);

  // The matrix has rows _and_ there is at least one pattern that is not a
  // wildcard in the first row.
  // The index of the first non-wildcard in the first row.
  let i: number;
  for (i = 0; i < first_row.length - 1; i++) {
    if (first_row[0][i].kind !== 'wildcard') break;
  }
  let end: (t: Tree) => Tree;
  if (i === 0) {
    end = x => x;
  } else {
    end = x => ({
      kind: 'swap',
      i,
      tree: x,
    });
  };

  const H = (p: Pattern): Set<Constructor> => {
    switch (p.kind) {
      case 'wildcard': return new Set();
      case 'constructor': return new Set([ctr(p)]);
      case 'or':
        return new Set([...H(p.left), ...H(p.right)]);
    }
  };
  const Σ: Set<Constructor> = new Set(M.flatMap(row => [...H(row[0][i])]));

  const L: SwitchClauseList = [];
  for (const ck of Σ) {
    L.push([ck, CC(S(ck, M))]);
  }
  if (!is_signature(Σ)) {
    L.push([{kind: 'default'}, CC(D(M))]);
  }
  return end({
    kind: 'switch',
    L,
  });
}

function is_signature(cs: Set<Constructor>) {
  const ctrs = [...cs];
  if (ctrs.length === 0) return false;
  const e = ctrs[0].enum;

  switch (e) {
    case 'Bool': {
      const expected_ctrs = new Set(['False', 'True']);
      for (const ctr of ctrs) {
        expected_ctrs.delete(ctr.variant);
      }
      return expected_ctrs.size === 0;
    }

    case 'List': {
      const expected_ctrs = new Set(['[]', '::']);
      for (const ctr of ctrs) {
        expected_ctrs.delete(ctr.variant);
      }
      return expected_ctrs.size === 0;
    }

    case 'Color': {
      const expected_ctrs = new Set(['Red', 'Green', 'Blue']);
      for (const ctr of ctrs) {
        expected_ctrs.delete(ctr.variant);
      }
      return expected_ctrs.size === 0;
    }
  }
  return false;
}

console.log(CC([
  [[p('Red')], 1],
  [[p('Green')], 2],
  [[p('Blue')], 3],
]));
