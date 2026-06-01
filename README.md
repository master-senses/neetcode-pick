# NeetCode 150 Picker

Spin a wheel to pick a random **unsolved** problem from the [NeetCode 150](https://neetcode.io/practice) list.

Solved problems are detected from [neetcode-submissions](https://github.com/master-senses/neetcode-submissions) (folders under `Data Structures & Algorithms/`). You can override progress in the browser:

- **Mark as done** — removes from the wheel (stored in `localStorage`)
- **Mark as not done** — adds back to the wheel even if it exists in the submissions repo

## Local

Open `index.html` with a static server (fetch needs HTTP):

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Update solved list from GitHub

```bash
curl -sL "https://api.github.com/repos/master-senses/neetcode-submissions/git/trees/main?recursive=1" \
  | jq -r '.tree[].path | select(test("^Data Structures & Algorithms/[^/]+/submission"))' \
  | sed 's|Data Structures & Algorithms/||; s|/submission.*||' | sort -u \
  | jq -R -s 'split("\n") | map(select(length > 0))' > data/repo-solved-slugs.json
```

Commit and push to refresh the live site.

## Live site

https://master-senses.github.io/neetcode-pick/
