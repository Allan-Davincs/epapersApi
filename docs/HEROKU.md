# Heroku testing deployment

Target: app `epaper-api`, team `measured2`. Run commands from `EpapersApi`.
Install the Heroku CLI and run `heroku login` locally first.

```powershell
heroku create epaper-api --team measured2 --stack heroku-24
heroku buildpacks:set heroku/nodejs --app epaper-api
$env:HEROKU_API_KEY = (heroku auth:token).Trim()
npm.cmd run heroku:config -- epaper-api
Remove-Item Env:HEROKU_API_KEY
```

The config uploader verifies team membership and imports local `.env` as Heroku config vars without logging values. It excludes local port, test, bootstrap and Heroku credentials. It sets the API origin and cookie domain to the assigned Heroku hostname, preserves APP_ORIGIN, and retains development dependencies needed by the worker and migration release process. Use a testing database and testing service credentials in `.env`; the worker sends queued emails and runs retention tasks against those services. For browser refresh cookies, host the frontend and API under the same site with HTTPS and update APP_ORIGIN, API_ORIGIN and COOKIE_DOMAIN accordingly.

Deploy the reviewed backend source from this repository root:

```powershell
heroku git:remote --app epaper-api
git push heroku HEAD:main
heroku ps:scale web=1:basic worker=1:basic --app epaper-api
heroku ps --app epaper-api
Invoke-RestMethod https://epaper-api.herokuapp.com/api/v1/health
```

Use the actual assigned web URL from `heroku apps:info --app epaper-api` for the health check (Heroku may append a suffix). Both Basic dynos are billed. Release automatically applies Prisma migrations; it does not seed or create an administrator. Run the curriculum seed once if needed with `heroku run npm run db:seed --app epaper-api`. Worker failure prevents queued email and file processing even if API health passes.

`.env`, config exports, credentials and local deployment records are ignored by Git and excluded from the slug. Deployment instructions and the Procfile remain versioned so deployments are reproducible. Existing uncommitted work must be included in a reviewed deployment commit before a Git push can deploy it.

See [Heroku Node.js support](https://devcenter.heroku.com/articles/nodejs-support), [Procfile](https://devcenter.heroku.com/articles/procfile), and [config vars](https://devcenter.heroku.com/articles/config-vars).
