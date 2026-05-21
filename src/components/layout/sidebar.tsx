// import React from 'react';
// import { 
//   AppstoreOutlined, 
//   FileTextOutlined, 
//   TeamOutlined, 
//   LineChartOutlined, 
//   BarChartOutlined, 
//   SettingOutlined,
//   ThunderboltFilled
// } from '@ant-design/icons';

// interface SidebarProps {
//   collapsed: boolean;
// }

// const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
//   const navItems = [
//     { label: 'Dashboard', icon: <AppstoreOutlined />, active: true },
//     { label: 'My assessments', icon: <FileTextOutlined />, active: false },
//     { label: 'Candidates', icon: <TeamOutlined />, active: false },
//     { label: 'Certificates', icon: <LineChartOutlined />, active: false },
//     { label: 'My profile', icon: <BarChartOutlined />, active: false },
//   ];

//   return (
//     <aside className={`${collapsed ? 'w-20' : 'w-72'} hidden lg:flex flex-col h-full bg-white border-r border-gray-100 shrink-0 font-sans transition-all duration-300 overflow-hidden`}>
//       <div className="flex flex-col h-full p-6 justify-between">
//         <div className="space-y-8">
//           <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}>
//             <div className="bg-black flex items-center justify-center rounded-xl size-10 text-white shadow-md shrink-0">
//               <ThunderboltFilled className="text-xl" />
//             </div>
//             {!collapsed && (
//               <h1 className="text-gray-900 text-lg font-bold leading-tight tracking-tight whitespace-nowrap animate-in fade-in duration-300">
//                 Talent Flow Ai
//               </h1>
//             )}
//           </div>

//           {/* Navigation Links */}
//           <nav className="space-y-1">
//             {navItems.map((item) => (
//               <a
//                 key={item.label}
//                 href="#"
//                 title={collapsed ? item.label : ''}
//                 className={`flex items-center rounded-xl transition-all duration-200 ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} ${
//                   item.active 
//                     ? 'bg-black text-white shadow-md' 
//                     : 'text-gray-500 hover:bg-gray-50 hover:text-black'
//                 }`}
//               >
//                 <span className="text-lg flex items-center shrink-0">{item.icon}</span>
//                 {!collapsed && (
//                   <span className="text-sm font-semibold whitespace-nowrap animate-in fade-in duration-300">
//                     {item.label}
//                   </span>
//                 )}
//               </a>
//             ))}
//           </nav>
//         </div>

//         {/* Footer/Settings */}
//         <div className="space-y-2 pt-6 border-t border-gray-50">
//           <a 
//             href="#" 
//             title={collapsed ? 'Settings' : ''}
//             className={`flex items-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-black transition-all duration-200 ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
//           >
//             <SettingOutlined className="text-lg shrink-0" />
//             {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">Settings</span>}
//           </a>
//         </div>
//       </div>
//     </aside>
//   );
// };

// export default Sidebar;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppstoreOutlined, 
  FileTextOutlined, 
  SafetyCertificateOutlined, 
  UserOutlined,
  SettingOutlined,
  ThunderboltFilled
} from '@ant-design/icons';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Updated navItems with 'path' property for routing
  const navItems = [
    { label: 'Dashboard', icon: <AppstoreOutlined />, path: '/' },
    { label: 'My assessments', icon: <FileTextOutlined />, path: '/my-assessments' },
    { label: 'Certificates', icon: <SafetyCertificateOutlined />, path: '/certificates' },
    { label: 'My profile', icon: <UserOutlined />, path: '/profile' },
  ];

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} hidden lg:flex flex-col h-full bg-white border-r border-gray-100 shrink-0 font-sans transition-all duration-300 overflow-hidden`}>
      <div className="flex flex-col h-full p-6 justify-between">
        <div className="space-y-8">
          {/* Logo Area */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}>
            <div className="bg-black flex items-center justify-center rounded-xl size-10 text-white shadow-md shrink-0">
              <ThunderboltFilled className="text-xl" />
            </div>
            {!collapsed && (
              <h1 className="text-gray-900 text-lg font-bold leading-tight tracking-tight whitespace-nowrap animate-in fade-in duration-300">
                Talent Flow Ai
              </h1>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              // Determine if the current item is active based on the URL path
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : ''}
                  className={`w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} ${
                    isActive 
                      ? 'bg-black text-white shadow-md' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <span className="text-lg flex items-center shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="text-sm font-semibold whitespace-nowrap animate-in fade-in duration-300">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer/Settings */}
        <div className="space-y-2 pt-6 border-t border-gray-50">
          <button 
            onClick={() => navigate('/settings')}
            title={collapsed ? 'Settings' : ''}
            className={`w-full flex items-center rounded-xl transition-all duration-200 cursor-pointer ${
                location.pathname === '/settings' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-black'
            } ${collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'}`}
          >
            <SettingOutlined className="text-lg shrink-0" />
            {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">Settings</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
