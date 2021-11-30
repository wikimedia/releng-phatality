import { PhatalityPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, OpenSearch Dashboards Platform `plugin()` initializer.
export function plugin() {
  return new PhatalityPlugin();
}
export { PhatalityPluginSetup, PhatalityPluginStart } from './types';
