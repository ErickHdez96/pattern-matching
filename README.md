# Pattern matching

Implementation of Compiling Pattern Matching to good Decision Trees

## Source language

Signature: complete set of the constructors for a datatype.

```
v ::=
    c(v₁,...,va)        a >= 0
```

We assume all programs to be well typed.

Arity a: The number of arguments each constructor expects.

We omit `()` from constant constructors (e.g. 0, true, etc.)

```
data Int = 0 | 1 | 2 | ...
data Bool = true | false
data Option t = Some e | None
```

For example:

Signature bool consists of constructors `true`, and `false`.

Signature Option, consists of constructors `Some` with arity 1, and `None` with arity 0.

Ocurrences: sequences of integers that describe the positions of subterms.  
An ocurrence is either empty: Λ  
Or an integer _k_ followed by an ocurrence _o_: k·o  
Ocurrences are paths to subterms in the following sence:

```
             v/Λ = v
c(v₁,...,va)/k·o = vk/o         (1 ≤ k ≤ a)
```

Patterns:

```
p ::=
  _                     wildcard
  c(p₁,...,pa)          constructor pattern (a ≥ 0)
  (p₁|p₂)               or-pattern
```

Pattern vector (p→): Sequence of patterns (p₁ ··· pn)  
Pattern matrix (P)  
Matrices of clauses (P → A):

```
        | p¹₁ ··· p¹n → a¹ |
        | p²₁ ··· p²n → a² |
P → A = |      .           |
        |      .           |
        |      .           |
        | pm₁ ··· pmn → am |
```

Vectors are of size _n_, matrices are of size _m_ × _n_ (m - height, n - width).  
In clauses, actions aj are integers. Row _j_ of matrix _P_ is sometimes depicted as p→j.

## Semantics of matching

Value _v_ is an instance of pattern _p_, written `p ⊆ v`, when there exists a substitution _σ_, such that `σ(p) = v`.

```
           _ ⊆ v
     (p₁|p₂) ⊆ v            iff p₁ ⊆ v or p₂ ⊆ v
c(p₁,...,p₂) ⊆ c(v₁,...,va) iff (p₁ ··· pa) ⊆ (v₁ ··· va)
 (p₁ ··· p₂) ⊆  (v₁ ··· va) iff, for all i,  pi ⊆ vi
```

The last line above defines the instance relation for vectors.

Value _v_ is not an instance of pattern p; written: p # v.

```
     (p₁|p₂) # v              iff p₁ # v and p₂ # v
c(p₁,...,pa) # c(v₁,...,va)   iff (p₁ ··· pa) # (v₁ ··· va)
 (p₁ ··· pa) # (v₁ ··· va)    iff there exists i, pi # vi
c(p₁,...,pa) # c'(v₁,...,va') with c ≠ c'
```

Definition 1. Let P be a pattern matrix of width n and height m. Let v→ be a value vector of size n. Let j be a row index (1 ≤ j ≤ m).  
Row j of P filters v→ (or equivalently, vector v→ matches row j), when the following two propositions hold:

1. Vector v→ is an instance of p→j. (written p→j ⊆ v→).
2. For all j', 1 ≤ j' < j, vector v→ is not an instance of p→j' (written p→j' # v→).

Furthermore, let P → A be a clause matrix. If row j of P filters v→, we write:

```
Match[v→, P → A] =def aj
```

In basic words, row j of a pattern matching matrix is selected, when it is the first to completely match the values.

## Matrix decomposition

The compilation process transforms a clause matrix via 2 basic operations.

**Specialization** by a constructor _c_, written S(c, P → A).

**Default** matrix, written D(P → A).

Both transformations apply to the rows of P → A, taking order into account, and yield the rows of the new matrices.

### Specialization

The 

```
| Pattern pj₁ | Row(s) of S(c, P → A) | Definition |
| c(q1,...,qa) | q1 ··· qa pj₂ ··· pjn → aj | If the constructor matches, the inner patterns are taken out and added to the matrix |
| c'(...) (c' ≠ c) | No row | If the constructor differs, the row is removed |
| _ | (_ * a) pj₂ ··· pjn → aj | _a_ wildcards are appended to the row, where a_ is the arity of the constructor _c_ |
| (q₁|q₂) | S(c, (q₁ pj₂ ··· pjn → aj)) | The or pattern is separated into two specialized rows. |
|         | S(c, (q₂ pj₂ ··· pjn → aj)) |
```

#### Example

```
        | []   _  → 1 |
P → A = |  _  []  → 2 |
        | _∷_ _∷_ → 3 |

S((∷), P → A) = | _ _ []  → 2 |
                | _ _ _∷_ → 3 |

S([], P → A) = | _  → 1 |
               | [] → 2 |
```

In the first specialization (constructor _c_ = `∷`):
* Row _1_ disappears because the constructor _c_ (`∷`) does not match the row's first constructor _c'_ (`[]`).
* Row two turns one `_` into two, because the constructor _c_ (`∷`) has arity 2.
* Row three removes the constructor _c_ (`∷`) because it is a match and instead appends the two inner patterns (`_`, and `_`).

In the second specialization (constructor _c_ = `[]`):
* Row 1 removes the constructor _c_ (`[]`), and because it has arity 0 (no inner patterns), the column disappears.
* Row 2 removes the wildcard because the constructor _c_ has arity 0.
* Row 3 disapperas because the constructor _c_ (`[]`) does not match the row's first constructor _c'_ (`∷`).

### Default

The default matrix retains the rows of P whose first pattern pj₁ admits all values c'(v₁,...,va) as instances, where constructor c' is not present in the first column of P.

```
| Row pj₁ | Row(s) of D(P) | Description |
| c(q₁,...,qa) | No row | c ≠ c', cannot match |
| _ | pj₂ ··· pjn → aj | _ admits any constructor |
| (q₁|q₂) | D(q₁ pj₂ ··· pjn → aj) | The or pattern is separated into two default rows. |
|         | D(q₂ pj₂ ··· pjn → aj) |
```

#### Example

```
        | [] _  → 1 |
Q → B = | _  [] → 2 |
        | _  _  → 3 |

D(Q → B) = | [] → 2 |
           | _  → 3 |
```

In the default matrix:
* Row 1 disappears because the row's first constructor _c_ (`[]`) is not a wildcard.
* Row 2 and row 3 remain because both have a wildcard as a first pattern. The wildcard is removed.

Specialization S(c, P → A) expresses exactly what remains to be matched, once it is known that v₁ admits _c_ as a head constructor; while the default matrix expresses what remains to be matched, once it is known that the head constructor of v₁ does not appear in the first column of P.

## Target language

Decision trees are the following terms:

```
A ::=
    Leaf(k)             success (k is an action, an integer)
    Fail                failure
    Switch o(L)         multi-way test (o is an ocurrence)
    Swap i(A)           stack swap (i is an integer)
```

A switch case list is a non-empty list of constructors and decision trees. An optional default case is written `*:A`:

```
L ::= c₁:A₁;···;cz:Az;[*:A]?
```

Invariants of a switch:
1. Constructors ck are in the same signature, and are distinct.
2. The default case is present, iff the set {c₁,...,cz} is not a signature.

v→ ⊢ A ⇒ k means "evaluating tree A w.r.t. stack v→ results in the action k".

## Evaluating decision trees

```
(Match)
v→ ⊢ Leaf(k) ⇒ k

(Swap)
   (vi ··· v₁ ··· vn) ⊢ A ⇒ k 
----------------------------------
(v₁ ··· vi ··· vn) ⊢ Swap i(A) ⇒ k 

(SwitchConstr)
c ⊢ L ⇒ c:A (w₁ ··· wa v₂ ··· vn) ⊢ A ⇒ k 
------------------------------------------
(c(w₁,...,wa) v₂ ··· vn) ⊢ Switch o(L) ⇒ k
```
