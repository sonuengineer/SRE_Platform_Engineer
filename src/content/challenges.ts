export type ChallengeLang = "python" | "javascript" | "sql";
export type ChallengeDifficulty = "easy" | "medium" | "hard";

export interface ChallengeCase {
  input: unknown[]; // arguments passed to the entry function
  expected: unknown; // expected return value (compared by value)
}

export interface SqlExpected {
  columns: string[];
  values: (string | number | null)[][];
}

export interface Challenge {
  id: string;
  lang: ChallengeLang;
  title: string;
  difficulty: ChallengeDifficulty;
  topic: string;
  prompt: string; // markdown: task + exact function signature (or SQL task)
  starter: string; // starter code the user edits
  entry?: string; // python/js ONLY: the function name the grader will call
  cases?: ChallengeCase[]; // python/js ONLY: 4+ cases incl edge cases
  sqlSetup?: string; // sql ONLY: CREATE TABLE + INSERT statements
  sqlExpected?: SqlExpected; // sql ONLY: expected rows of the user's SELECT
  orderMatters?: boolean; // sql ONLY: default false
  relatedLessons?: string[];
}

export const CHALLENGES: Challenge[] = [
  // ---------------------------------------------------------------------------
  // PYTHON (5)
  // ---------------------------------------------------------------------------
  {
    id: "py-two-sum",
    lang: "python",
    title: "Two Sum",
    difficulty: "easy",
    topic: "arrays / hashing",
    prompt: [
      "Write a function `two_sum(nums, target)` that returns the indices of the",
      "two numbers in `nums` that add up to `target`.",
      "",
      "Return the indices as a list `[i, j]` with `i < j`. You may assume exactly",
      "one valid answer exists and you may not use the same element twice.",
      "",
      "Signature: `def two_sum(nums: list[int], target: int) -> list[int]:`",
    ].join("\n"),
    starter: [
      "def two_sum(nums, target):",
      "    # TODO: return [i, j] where nums[i] + nums[j] == target",
      "    pass",
    ].join("\n"),
    entry: "two_sum",
    cases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      { input: [[0, 4, 3, 0], 0], expected: [0, 3] },
    ],
    relatedLessons: ["python-data-model"],
  },
  {
    id: "py-is-palindrome",
    lang: "python",
    title: "Valid Palindrome",
    difficulty: "easy",
    topic: "strings",
    prompt: [
      "Write a function `is_palindrome(s)` that returns `True` if the string `s`",
      "reads the same forwards and backwards after lowercasing and removing every",
      "character that is not a letter or digit, otherwise `False`.",
      "",
      "Signature: `def is_palindrome(s: str) -> bool:`",
    ].join("\n"),
    starter: [
      "def is_palindrome(s):",
      "    # TODO: ignore case and non-alphanumeric chars, then check symmetry",
      "    pass",
    ].join("\n"),
    entry: "is_palindrome",
    cases: [
      { input: ["A man, a plan, a canal: Panama"], expected: true },
      { input: ["race a car"], expected: false },
      { input: [""], expected: true },
      { input: [".,"], expected: true },
      { input: ["0P"], expected: false },
    ],
    relatedLessons: ["python-data-model"],
  },
  {
    id: "py-reverse-words",
    lang: "python",
    title: "Reverse Words",
    difficulty: "easy",
    topic: "strings",
    prompt: [
      "Write a function `reverse_words(s)` that returns a string with the words of",
      "`s` in reverse order. A word is a maximal run of non-space characters.",
      "Collapse any runs of whitespace and strip leading/trailing spaces so the",
      "result has words separated by exactly one space.",
      "",
      "Signature: `def reverse_words(s: str) -> str:`",
    ].join("\n"),
    starter: [
      "def reverse_words(s):",
      "    # TODO: split on whitespace, reverse, join with single spaces",
      "    pass",
    ].join("\n"),
    entry: "reverse_words",
    cases: [
      { input: ["the sky is blue"], expected: "blue is sky the" },
      { input: ["  hello world  "], expected: "world hello" },
      { input: ["a good   example"], expected: "example good a" },
      { input: ["single"], expected: "single" },
      { input: ["   "], expected: "" },
    ],
    relatedLessons: ["python-data-model"],
  },
  {
    id: "py-fizzbuzz-list",
    lang: "python",
    title: "FizzBuzz List",
    difficulty: "easy",
    topic: "control flow",
    prompt: [
      "Write a function `fizzbuzz_list(n)` that returns a list of strings for the",
      "numbers 1 through `n` inclusive. For multiples of 3 use \"Fizz\", for",
      "multiples of 5 use \"Buzz\", for multiples of both use \"FizzBuzz\", and",
      "otherwise use the number itself as a string.",
      "",
      "Signature: `def fizzbuzz_list(n: int) -> list[str]:`",
    ].join("\n"),
    starter: [
      "def fizzbuzz_list(n):",
      "    # TODO: build and return the list of strings for 1..n",
      "    pass",
    ].join("\n"),
    entry: "fizzbuzz_list",
    cases: [
      { input: [1], expected: ["1"] },
      { input: [3], expected: ["1", "2", "Fizz"] },
      { input: [5], expected: ["1", "2", "Fizz", "4", "Buzz"] },
      {
        input: [15],
        expected: [
          "1",
          "2",
          "Fizz",
          "4",
          "Buzz",
          "Fizz",
          "7",
          "8",
          "Fizz",
          "Buzz",
          "11",
          "Fizz",
          "13",
          "14",
          "FizzBuzz",
        ],
      },
      { input: [0], expected: [] },
    ],
    relatedLessons: ["python-data-model"],
  },
  {
    id: "py-group-anagrams",
    lang: "python",
    title: "Group Anagrams",
    difficulty: "medium",
    topic: "hashing / sorting",
    prompt: [
      "Write a function `group_anagrams(words)` that groups the strings in `words`",
      "into lists of anagrams. Each inner list must keep the words in their",
      "original input order, and the outer list must be sorted by each group's",
      "sorted-letters key so the result is deterministic.",
      "",
      "Example: `[\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"]` ->",
      "`[[\"bat\"], [\"tan\", \"nat\"], [\"eat\", \"tea\", \"ate\"]]`.",
      "",
      "Signature: `def group_anagrams(words: list[str]) -> list[list[str]]:`",
    ].join("\n"),
    starter: [
      "def group_anagrams(words):",
      "    # TODO: bucket words by sorted letters, then sort groups by that key",
      "    pass",
    ].join("\n"),
    entry: "group_anagrams",
    cases: [
      {
        input: [["eat", "tea", "tan", "ate", "nat", "bat"]],
        expected: [["bat"], ["tan", "nat"], ["eat", "tea", "ate"]],
      },
      { input: [[""]], expected: [[""]] },
      { input: [["a"]], expected: [["a"]] },
      { input: [[]], expected: [] },
      {
        input: [["abc", "bca", "cab", "xyz"]],
        expected: [["abc", "bca", "cab"], ["xyz"]],
      },
    ],
    relatedLessons: ["python-data-model"],
  },

  // ---------------------------------------------------------------------------
  // JAVASCRIPT (4)
  // ---------------------------------------------------------------------------
  {
    id: "js-chunk",
    lang: "javascript",
    title: "Chunk Array",
    difficulty: "easy",
    topic: "arrays",
    prompt: [
      "Write a function `entry(array, size)` that splits `array` into groups of",
      "length `size`. The final chunk may be shorter if the array cannot be split",
      "evenly. If `size` is less than 1, return an empty array.",
      "",
      "Signature: `function entry(array, size) { ... }`",
    ].join("\n"),
    starter: [
      "function entry(array, size) {",
      "  // TODO: return an array of chunks, each up to `size` long",
      "}",
    ].join("\n"),
    entry: "entry",
    cases: [
      { input: [[1, 2, 3, 4, 5], 2], expected: [[1, 2], [3, 4], [5]] },
      { input: [[1, 2, 3, 4], 2], expected: [[1, 2], [3, 4]] },
      { input: [[1, 2, 3], 0], expected: [] },
      { input: [[], 3], expected: [] },
      { input: [[1, 2, 3], 10], expected: [[1, 2, 3]] },
    ],
    relatedLessons: ["ts-async-patterns"],
  },
  {
    id: "js-unique",
    lang: "javascript",
    title: "Unique Values",
    difficulty: "easy",
    topic: "arrays / sets",
    prompt: [
      "Write a function `entry(array)` that returns a new array with duplicate",
      "values removed, preserving the order of first appearance. Values are",
      "compared with strict equality (`===`).",
      "",
      "Signature: `function entry(array) { ... }`",
    ].join("\n"),
    starter: [
      "function entry(array) {",
      "  // TODO: return values in first-seen order without duplicates",
      "}",
    ].join("\n"),
    entry: "entry",
    cases: [
      { input: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] },
      { input: [[]], expected: [] },
      { input: [["a", "b", "a", "c", "b"]], expected: ["a", "b", "c"] },
      { input: [[1, 1, 1, 1]], expected: [1] },
      { input: [[3, 1, 2, 3, 2, 1]], expected: [3, 1, 2] },
    ],
    relatedLessons: ["ts-async-patterns"],
  },
  {
    id: "js-flatten-depth",
    lang: "javascript",
    title: "Flatten Depth",
    difficulty: "medium",
    topic: "recursion / arrays",
    prompt: [
      "Write a function `entry(array, depth)` that flattens `array` up to `depth`",
      "levels deep. A `depth` of 0 returns a shallow copy of the input unchanged.",
      "Non-array elements are kept as-is.",
      "",
      "Signature: `function entry(array, depth) { ... }`",
    ].join("\n"),
    starter: [
      "function entry(array, depth) {",
      "  // TODO: recursively flatten up to `depth` levels",
      "}",
    ].join("\n"),
    entry: "entry",
    cases: [
      { input: [[1, [2, [3, [4]]]], 1], expected: [1, 2, [3, [4]]] },
      { input: [[1, [2, [3, [4]]]], 2], expected: [1, 2, 3, [4]] },
      { input: [[1, [2, [3, [4]]]], 0], expected: [1, [2, [3, [4]]]] },
      { input: [[1, 2, 3], 5], expected: [1, 2, 3] },
      { input: [[[1], [2], [3]], 1], expected: [1, 2, 3] },
    ],
    relatedLessons: ["ts-async-patterns"],
  },
  {
    id: "js-sum-matrix",
    lang: "javascript",
    title: "Sum Matrix",
    difficulty: "easy",
    topic: "arrays / iteration",
    prompt: [
      "Write a function `entry(matrix)` that returns the sum of every number in a",
      "2D array (an array of rows, each row an array of numbers). An empty matrix",
      "or empty rows contribute 0.",
      "",
      "Signature: `function entry(matrix) { ... }`",
    ].join("\n"),
    starter: [
      "function entry(matrix) {",
      "  // TODO: return the total of all numbers across all rows",
      "}",
    ].join("\n"),
    entry: "entry",
    cases: [
      { input: [[[1, 2], [3, 4]]], expected: 10 },
      { input: [[]], expected: 0 },
      { input: [[[], []]], expected: 0 },
      { input: [[[5]]], expected: 5 },
      { input: [[[1, -1], [2, -2], [10]]], expected: 10 },
    ],
    relatedLessons: ["ts-async-patterns"],
  },

  // ---------------------------------------------------------------------------
  // SQL (5)
  // ---------------------------------------------------------------------------
  {
    id: "sql-filter-active-users",
    lang: "sql",
    title: "Filter Active Users",
    difficulty: "easy",
    topic: "WHERE",
    prompt: [
      "Table `users(id INTEGER, name TEXT, active INTEGER)` holds account rows",
      "where `active` is 1 for active accounts and 0 otherwise.",
      "",
      "Complete the query to select the `id` and `name` of every active user.",
    ].join("\n"),
    starter: "SELECT id, name FROM users WHERE /* TODO */;",
    sqlSetup: [
      "CREATE TABLE users (id INTEGER, name TEXT, active INTEGER);",
      "INSERT INTO users (id, name, active) VALUES",
      "  (1, 'Ada', 1),",
      "  (2, 'Grace', 0),",
      "  (3, 'Linus', 1),",
      "  (4, 'Dennis', 1),",
      "  (5, 'Ken', 0);",
    ].join("\n"),
    sqlExpected: {
      columns: ["id", "name"],
      values: [
        [1, "Ada"],
        [3, "Linus"],
        [4, "Dennis"],
      ],
    },
    relatedLessons: ["pg-indexes", "pg-query-planning"],
  },
  {
    id: "sql-aggregate-sales-by-region",
    lang: "sql",
    title: "Sales by Region",
    difficulty: "medium",
    topic: "GROUP BY / SUM",
    prompt: [
      "Table `sales(id INTEGER, region TEXT, amount INTEGER)` records individual",
      "sales.",
      "",
      "Complete the query to return each `region` together with the total of its",
      "`amount` values aliased as `total`. Order of rows does not matter.",
    ].join("\n"),
    starter: "SELECT region, SUM(amount) AS total FROM sales /* TODO */;",
    sqlSetup: [
      "CREATE TABLE sales (id INTEGER, region TEXT, amount INTEGER);",
      "INSERT INTO sales (id, region, amount) VALUES",
      "  (1, 'North', 100),",
      "  (2, 'North', 50),",
      "  (3, 'South', 200),",
      "  (4, 'East', 75),",
      "  (5, 'South', 25);",
    ].join("\n"),
    sqlExpected: {
      columns: ["region", "total"],
      values: [
        ["East", 75],
        ["North", 150],
        ["South", 225],
      ],
    },
    relatedLessons: ["pg-query-planning"],
  },
  {
    id: "sql-join-orders-customers",
    lang: "sql",
    title: "Join Orders and Customers",
    difficulty: "medium",
    topic: "INNER JOIN",
    prompt: [
      "Two tables are available:",
      "- `customers(id INTEGER, name TEXT)`",
      "- `orders(id INTEGER, customer_id INTEGER, total INTEGER)`",
      "",
      "Complete the query to return the customer `name` and the order `total` for",
      "every order, joining orders to their customer. Row order does not matter.",
    ].join("\n"),
    starter:
      "SELECT c.name, o.total FROM orders o JOIN customers c ON /* TODO */;",
    sqlSetup: [
      "CREATE TABLE customers (id INTEGER, name TEXT);",
      "INSERT INTO customers (id, name) VALUES",
      "  (1, 'Ada'),",
      "  (2, 'Grace'),",
      "  (3, 'Linus');",
      "CREATE TABLE orders (id INTEGER, customer_id INTEGER, total INTEGER);",
      "INSERT INTO orders (id, customer_id, total) VALUES",
      "  (10, 1, 40),",
      "  (11, 1, 60),",
      "  (12, 2, 25),",
      "  (13, 3, 80);",
    ].join("\n"),
    sqlExpected: {
      columns: ["name", "total"],
      values: [
        ["Ada", 40],
        ["Ada", 60],
        ["Grace", 25],
        ["Linus", 80],
      ],
    },
    relatedLessons: ["pg-indexes", "pg-query-planning"],
  },
  {
    id: "sql-having-frequent-buyers",
    lang: "sql",
    title: "Frequent Buyers",
    difficulty: "hard",
    topic: "GROUP BY / HAVING",
    prompt: [
      "Table `orders(id INTEGER, customer TEXT, total INTEGER)` holds one row per",
      "order.",
      "",
      "Complete the query to return each `customer` and their order count aliased",
      "as `order_count`, but only for customers who placed 2 or more orders. Row",
      "order does not matter.",
    ].join("\n"),
    starter:
      "SELECT customer, COUNT(*) AS order_count FROM orders GROUP BY customer /* TODO */;",
    sqlSetup: [
      "CREATE TABLE orders (id INTEGER, customer TEXT, total INTEGER);",
      "INSERT INTO orders (id, customer, total) VALUES",
      "  (1, 'Ada', 40),",
      "  (2, 'Ada', 60),",
      "  (3, 'Grace', 25),",
      "  (4, 'Linus', 10),",
      "  (5, 'Linus', 20),",
      "  (6, 'Linus', 30);",
    ].join("\n"),
    sqlExpected: {
      columns: ["customer", "order_count"],
      values: [
        ["Ada", 2],
        ["Linus", 3],
      ],
    },
    relatedLessons: ["pg-query-planning"],
  },
  {
    id: "sql-subquery-above-average",
    lang: "sql",
    title: "Above Average Price",
    difficulty: "hard",
    topic: "subquery / ORDER BY",
    prompt: [
      "Table `products(id INTEGER, name TEXT, price INTEGER)` lists products.",
      "",
      "Complete the query to return the `name` and `price` of every product whose",
      "price is strictly greater than the average price of all products. Return",
      "the rows ordered by `price` ascending.",
    ].join("\n"),
    starter:
      "SELECT name, price FROM products WHERE price > (/* TODO */) ORDER BY price ASC;",
    sqlSetup: [
      "CREATE TABLE products (id INTEGER, name TEXT, price INTEGER);",
      "INSERT INTO products (id, name, price) VALUES",
      "  (1, 'Pen', 2),",
      "  (2, 'Notebook', 6),",
      "  (3, 'Backpack', 40),",
      "  (4, 'Stapler', 12),",
      "  (5, 'Marker', 4);",
    ].join("\n"),
    sqlExpected: {
      columns: ["name", "price"],
      values: [
        ["Stapler", 12],
        ["Backpack", 40],
      ],
    },
    orderMatters: true,
    relatedLessons: ["pg-indexes", "pg-query-planning"],
  },
];
