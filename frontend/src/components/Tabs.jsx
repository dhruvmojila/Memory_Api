import React from 'react';

const Tabs = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue || children[0].props.value);

  const handleClick = (e, newActiveTab) => {
    e.preventDefault();
    setActiveTab(newActiveTab);
  };

  return (
    <div className="w-full">
      <div className="border-b border-gray-200">
        {React.Children.map(children, child => {
          if (child.type.displayName === 'TabsList') {
            return React.cloneElement(child, { activeTab, handleClick });
          }
          return null;
        })}
      </div>
      <div className="mt-2">
        {React.Children.map(children, child => {
          if (child.type.displayName === 'TabsContent' && child.props.value === activeTab) {
            return child;
          }
          return null;
        })}
      </div>
    </div>
  );
};

const TabsList = ({ children, activeTab, handleClick }) => {
  return (
    <div className="flex -mb-px">
      {React.Children.map(children, (child, index) => {
        return React.cloneElement(child, { activeTab, handleClick, isFirst: index === 0, isLast: index === React.Children.count(children) - 1 });
      })}
    </div>
  );
};
TabsList.displayName = 'TabsList';

const TabsTrigger = ({ children, value, activeTab, handleClick, isFirst, isLast }) => {
  const baseClasses = "py-4 px-6 font-medium text-center text-gray-500 hover:text-gray-700 focus:outline-none";
  const activeClasses = "border-b-2 border-blue-500 text-blue-600";
  const inactiveClasses = "border-b-2 border-transparent";
  const firstClasses = isFirst ? "rounded-tl-lg" : "";
  const lastClasses = isLast ? "rounded-tr-lg" : "";

  return (
    <button
      className={`${baseClasses} ${activeTab === value ? activeClasses : inactiveClasses} ${firstClasses} ${lastClasses}`}
      onClick={e => handleClick(e, value)}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ children }) => {
  return <div className="p-4">{children}</div>;
};
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };