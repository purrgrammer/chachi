import { useState, ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export interface TabItem {
  id: string;
  name: string;
  icon: ReactNode;
  children: ReactNode;
}

interface TabContainerProps {
  tabs: TabItem[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  contentClassName?: string;
}

export function TabContainer({
  tabs,
  defaultTab,
  onTabChange,
  className,
  contentClassName,
}: TabContainerProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={className}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            <div className="flex flex-row items-center gap-2">
              {tab.icon}
              <span
                className={
                  tab.id === activeTab
                    ? "visible transition-all"
                    : "hidden sm:block"
                }
              >
                {tab.name}
              </span>
            </div>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className={contentClassName}>
          {tab.children}
        </TabsContent>
      ))}
    </Tabs>
  );
}
