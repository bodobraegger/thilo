import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      {(offlineReady || needRefresh) && (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-4"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {offlineReady ? (
                <p className="text-sm text-gray-700">
                  App ready to work offline
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  New content available, click reload to update.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {needRefresh && (
                <button
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                  onClick={() => updateServiceWorker(true)}
                >
                  Reload
                </button>
              )}
              <button
                className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                onClick={() => close()}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
