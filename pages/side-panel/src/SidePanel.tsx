import { useStorage, withErrorBoundary, withSuspense, useQuery, searchAtomsByUriQuery } from '@extension/shared';
import { exampleThemeStorage, currentAccountStorage, currentTabStorage } from '@extension/storage';
import { Home } from '@extension/ui';

const SidePanel = () => {
  const account = useStorage(currentAccountStorage);
  const currentTab = useStorage(currentTabStorage);

  const { data, error, refetch } = useQuery(searchAtomsByUriQuery, {
    variables: {
      uri: currentTab?.url,
      address: account?.toLocaleLowerCase() || '',
    },
    skip: !currentTab?.url,
    fetchPolicy: 'cache-and-network',
  });

  return (
    <div className="p-2">
      <Home />
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <div> Loading ... </div>), <div> Error Occur </div>);
