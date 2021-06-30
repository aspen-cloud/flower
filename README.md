# flow-sheets

Created with CodeSandbox

## we/spreadsheets

Theres a slight issue when selecting in the table and zooming. I opened [a GitHub issue](https://github.com/palantir/blueprint/issues/4783) ... for now I just hack/fixed it locally.

- This uses a local fork of @blueprintjs/table@3.7.1
- I am refering to a local repo for this, so pull down the blueprintjs repo and run `git checkout 1aa71605`
- Apply the following changes to `locator.js`:
  - line ~238: + `const scaleX = this.cellContainerElement.getBoundingClientRect().width / this.cellContainerElement.offsetWidth;`
  - Divide the return statement by `scaleX`
  - line ~255: + `const scaleY = this.cellContainerElement.getBoundingClientRect().height / this.cellContainerElement.offsetHeight;`
  - Divide the return statement by `scaleY`
- Commit that to a branch if you want
- In your local repo (path/to/local/blueprintjs/packages/table), run `yarn compile`
- Update package.json in this project to point to that directory
- `rm -rf node_modules` `yarn`
- For any additional updates
  - Recompile package
  - `yarn upgrade @blueprintjs/table`
