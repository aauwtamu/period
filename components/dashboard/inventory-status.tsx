import { RefreshCw } from "lucide-react";
export function InventoryStatus({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="inventory-status" role="status">
      <p>{message}</p>
      <button className="button button-outline" onClick={retry}>
        <RefreshCw size={15} />
        Try again
      </button>
    </div>
  );
}
