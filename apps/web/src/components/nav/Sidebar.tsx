import React from "react";
import SidebarItem from "./SidebarItem";
import { InboxIcon } from "@heroicons/react/24/solid";

type Props = {};

const Sidebar = (props: Props) => {
  return (
    <aside className="w-full max-w-[200px] p-5">
      <SidebarItem icon={InboxIcon} name="Inbox" count={3} active />
    </aside>
  );
};

export default Sidebar;
