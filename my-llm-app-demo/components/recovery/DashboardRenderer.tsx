import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"
import { COMPONENT_REGISTRY, ROUTE_MAP, WidgetConfig } from "./registry";

export default function DashboardRenderer({ config }: { config: WidgetConfig[] }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {config.map((widget) => {
        const Component = COMPONENT_REGISTRY[widget.type];
        const targetPath = ROUTE_MAP[widget.type]
        
        if (!Component) {
            console.warn(`No component found for type: ${widget.type}`);
            return null;
        }

        return (
          <div 
            key={widget.id}
            onClick={() => targetPath && router.push(targetPath)}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] group"
          >
            <Component {...widget.props} isPreview={true} />
            
            {targetPath && (
              <div className="mt-2 text-sm text-blue-600 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                View Details 
                <span className="ml-1">→</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}