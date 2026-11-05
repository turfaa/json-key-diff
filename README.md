# JSON Key Diff

A static web app that compares the **keys** (at any depth) of two JSON documents and lists the keys that exist in one but not the other. Values are ignored, and nothing leaves the browser.

## Use

Open `index.html` in a browser (or serve the folder, e.g. `python3 -m http.server`), paste two JSON documents, and press **Compare keys** (or Cmd/Ctrl+Enter).

- Paths use dot notation: `user.address.city`. Keys that aren't plain identifiers are quoted: `["key.with.dots"]`.
- **Arrays**: *Merge elements* folds every element into `items[*]`, so it compares the shape of the elements. *Compare by index* gives each element its own path (`items[0]`, `items[1]`).
- **Only report top-most missing key**: if `user.address` is missing, its children aren't listed separately; the count of nested keys is shown instead. Turn it off to list every path.

## Merge

**Merge** builds a new JSON from A plus every key that only exists in B, at any depth. Existing values are never overwritten: if a key is in both, A's value is kept (use **Swap A ↔ B** to make B win). Arrays are merged element by element, and B's extra elements are appended. If the two sides have different types at a key (e.g. object vs string), A's value is kept. **Copy** puts the result on the clipboard; **Use as A** replaces A with it so you can re-compare.

## Test

```sh
node --test
```

## Container image

Every push to `main` runs the tests and, if they pass, publishes an nginx image to `ghcr.io/turfaa/json-key-diff`, tagged `latest` and `sha-<commit>` (see `.github/workflows/publish-image.yml`).

```sh
docker run --rm -p 8080:8080 ghcr.io/turfaa/json-key-diff:latest
# then open http://localhost:8080
```
