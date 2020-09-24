# Bubble Pop

**It might be a little slow** because the bubble entities are managed on the server and don't seem to update fast enough to the client. There will eventually be an update where the bubbles are local instead but still in sync with everyone.

## Try it now!

Open **Create**, click **Import Entities from URL (.json)** and paste this link:

-   **Server version (slower but synced)**
    <br>
    https://files.tivolicloud.com/maki/scripts/bubble-pop/assets/bubble-pop.server.json
-   **Local version (fast but unsynced)**
    <br>
    https://files.tivolicloud.com/maki/scripts/bubble-pop/assets/bubble-pop.local.json

## How to compile

```bash
yarn
yarn build
```

Then upload the `dist` folder
