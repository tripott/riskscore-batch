# Risk Score Batch API

## TODO

- Create new branch and commit all work in branch.
- Review code within api/lib/fetch-mw-risk-api.
- Create the following 4 visualizations fetch functions similar to **get-home.js**, **post-bundle.js**, and **get-risk-score-data.js**:
  - create **get-risk-score-viz.js**
  - create **get-matrix-viz.js**
  - create **get-risk-factors-viz.js**
  - create **get-adverse-effects-viz.js**

> See 4 viz in https://developer.trhc.com/getting-started/mw-api

- Utilize these 4 viz fetch functions and create following express-js endpoints within api/index.js

- `POST \profiles` --> calls to **post-bundle.js**
- `GET \profiles\{id}\scoredata` --> Calls to **get-risk-score-data.js**
- `GET \profiles\{id}\riskscore` --> Calls to **get-risk-score-viz.js**
- `GET \profiles\{id}\matrix` --> Calls to **get-matrix-viz.js**
- `GET \profiles\{id}\adverse-effects` --> Calls to **get-adverse-effects-viz.js**
