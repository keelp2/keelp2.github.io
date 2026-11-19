# Call of Doodie source

`fps/game.js` is **generated**. Edit the section files here, then rebuild:

```bash
node fps/tools/build.js
```

- `ORDER` lists the sections in the order they are joined. The game still runs as one script in one shared scope: the wrapper opens in `00-core.js` and closes in `41-boot.js`, so any section can use anything declared in an earlier one (and functions anywhere).
- `node fps/tools/build.js --check` fails if `game.js` is out of date. A GitHub check runs it on every push.
- To add a section: create `NN-name.js`, add it to `ORDER` in the right place, and rebuild.
- After rebuilding, bump the `game.js?v=` number in `fps/index.html` so players don't get a cached copy.
