import { ApiErrorState } from "@/components/ApiErrorState";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, getChanges } from "@/lib/api";
import { ChangesClient } from "./ChangesClient";

export default async function ChangesPage() {
  try {
    const items = await getChanges({ limit: 200 });
    return <ChangesClient items={items} />;
  } catch (error) {
    return (
      <div className="pageEnter">
        <PageHeader
          title="التغيّرات"
          description="سجل تغيّرات الأسعار والكميات."
        />
        <ApiErrorState
          message={
            error instanceof ApiError
              ? error.message
              : "تعذّر تحميل سجل التغيّرات."
          }
        />
      </div>
    );
  }
}
