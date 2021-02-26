import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { PhatalityPluginSetup, PhatalityPluginStart } from './types';
import { PhatalityTab } from './components/tab';


export class PhatalityPlugin implements Plugin<PhatalityPluginSetup, PhatalityPluginStart> {
  public setup(core: CoreSetup, { discover }: PhatalityPluginSetup) {
    discover.docViews.addDocView({
      title: 'Phatality',
      order: 30,
      component: PhatalityTab
    });
    return { discover };
  }

  public start(core: CoreStart, { discover }): PhatalityPluginStart {
    return { discover };
  }

  public stop() {}
}
