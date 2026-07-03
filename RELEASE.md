# Release Checklist

Use this checklist for every `v1.x` release.

## Before Release

- [ ] All tests pass: `npm run test:coverage`
- [ ] Coverage meets threshold (≥ 60%)
- [ ] Build succeeds: `npm run build`
- [ ] `CHANGELOG.md` updated with new version entry
- [ ] Version bumped in `package.json`
- [ ] Docs site reflects all new/changed commands

## Smoke Test (Local)

```bash
# Pack the tarball
npm pack

# Install from tarball in a temp directory
mkdir /tmp/pilot-test && cd /tmp/pilot-test
npm install -g /path/to/pilot-ai-cli-1.0.0.tgz

# Verify
pilot --version     # Should show correct version
pilot --help        # Should list all commands
pilot explain --help  # (if implemented) Should show usage
```

- [ ] `pilot --version` shows correct version
- [ ] `pilot --help` shows all commands
- [ ] `pilot explain <file>` works on a valid file
- [ ] `pilot fix "<error>"` returns a diagnosis
- [ ] `pilot plugin list` runs without crash

## Release

- [ ] Create git tag: `git tag v1.x.x`
- [ ] Push tag: `git push origin v1.x.x`
- [ ] GitHub Actions `publish.yml` triggers and publishes to npm
- [ ] Verify on npm: `npm view pilot-ai-cli`
- [ ] Create GitHub Release with notes from CHANGELOG

## Post-Release

- [ ] Verify global install from npm: `npm install -g pilot-ai-cli`
- [ ] Run smoke test from npm-installed version
- [ ] Announce release (README badge, Discord, Twitter, etc.)
- [ ] Start next version planning (bump to `x.x+1.0` in `package.json`)

## Technical Debt for v1.1.0

- Full implementation of `--apply` auto-fix in `pilot fix`
- Multi-file context for `pilot explain`
- Plugin marketplace / registry
- Auto-update mechanism
- Telemetry considerations (opt-in, privacy-first)
- Windows-specific packaging
- i18n for documentation site
