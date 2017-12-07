# Stately - The non-manager state manager
### alpha release. don't use this if you happen to discover it.

Central repository for application wide state handlers. Does not control state, simply notifies listeners of changes. You register listeners for state boolean values, and when the listened for state value is true, listeners are dispatched with current state data.


```bash
npm install stately-js
```

Examples can be found in the example folder.
