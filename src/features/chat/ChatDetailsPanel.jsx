import React, { useMemo } from "react";
import {
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Briefcase,
  ShieldCheck,
  Users,
  X,
  Hash,
  User,
} from "lucide-react";

import IconButton from "../../components/ui/IconButton";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatJoinedDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const Avatar = ({ name, src, size = "lg" }) => {
  const dim = size === "lg" ? "h-16 w-16 text-section" : "h-8 w-8 text-bodySm";
  return (
    <div
      className={`${dim} rounded-full bg-accent-soft text-accent font-semibold flex items-center justify-center overflow-hidden shrink-0`}
    >
      {src ? (
        <img
          src={src.startsWith("http") ? src : `/images/${src}`}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
};

const ContactRow = ({ icon: Icon, label, value, href }) => {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-md py-sm">
      <Icon className="h-4 w-4 text-fg-subtle shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-caption text-fg-subtle">{label}</p>
        <p className="text-bodySm text-fg truncate">{value}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noreferrer"
        className="block hover:bg-subtle/40 rounded-md px-md transition-colors duration-fast"
      >
        {content}
      </a>
    );
  }
  return <div className="px-md">{content}</div>;
};

/* ============================================================
   DM details: contact info pulled from the existing user record
============================================================ */
const DmDetails = ({ peer, employee }) => {
  const u = employee || peer;
  if (!u) return null;

  const whatsappHref = u.whatsapp
    ? `https://wa.me/${String(u.whatsapp).replace(/[^0-9]/g, "")}`
    : null;
  const phoneHref = u.phoneNumber ? `tel:${u.phoneNumber}` : null;
  const emailHref = u.email ? `mailto:${u.email}` : null;
  const joinedLabel = formatJoinedDate(u.joinedDate);

  return (
    <>
      <div className="flex flex-col items-center gap-sm px-lg pt-lg pb-md text-center">
        <Avatar name={u.name} src={u.avatar} size="lg" />
        <div>
          <h3 className="text-section text-fg">{u.name || "Unknown"}</h3>
          {u.designation && (
            <p className="text-bodySm text-fg-muted mt-[2px] capitalize">
              {u.designation}
            </p>
          )}
          {u.role && u.role !== "employee" && (
            <span className="inline-flex items-center gap-xs text-caption font-medium px-sm py-[2px] rounded-xs bg-accent-soft text-accent border border-accent-200 mt-sm capitalize">
              <ShieldCheck className="h-3 w-3" />
              {u.role}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-line-subtle py-sm">
        <p className="px-lg pb-xs text-eyebrow uppercase text-fg-subtle tracking-wider">
          Contact
        </p>
        <div className="flex flex-col">
          <ContactRow icon={Mail} label="Email" value={u.email} href={emailHref} />
          <ContactRow
            icon={Phone}
            label="Phone"
            value={u.phoneNumber}
            href={phoneHref}
          />
          <ContactRow
            icon={MessageCircle}
            label="WhatsApp"
            value={u.whatsapp}
            href={whatsappHref}
          />
          <ContactRow
            icon={Briefcase}
            label="Designation"
            value={u.designation}
          />
          <ContactRow icon={Calendar} label="Joined" value={joinedLabel} />
        </div>
      </div>
    </>
  );
};

/* ============================================================
   Channel details: member roster, tap to DM
============================================================ */
const ChannelDetails = ({ conversation, employees, currentUserId, onStartDm }) => {
  const employeeMap = useMemo(
    () => new Map((employees || []).map((e) => [e.id, e])),
    [employees]
  );

  const members = (conversation.participants || []).map((p) => ({
    ...p,
    full: employeeMap.get(p.id),
  }));

  return (
    <>
      <div className="flex flex-col items-center gap-sm px-lg pt-lg pb-md text-center">
        <div className="h-16 w-16 rounded-full bg-warning-50 text-warning-700 flex items-center justify-center shrink-0">
          <Hash className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h3 className="text-section text-fg">{conversation.title}</h3>
          <p className="text-bodySm text-fg-muted mt-[2px]">Project channel</p>
        </div>
      </div>

      <div className="border-t border-line-subtle py-sm">
        <div className="flex items-center gap-sm px-lg pb-xs">
          <Users className="h-3.5 w-3.5 text-fg-subtle" />
          <span className="text-eyebrow uppercase text-fg-subtle tracking-wider">
            Members
          </span>
          <span className="text-caption text-fg-subtle tabular-nums ml-auto">
            {members.length}
          </span>
        </div>

        <ul className="flex flex-col">
          {members.map((m) => {
            const isMe = m.id === currentUserId;
            const designation = m.full?.designation;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => !isMe && onStartDm?.(m.id)}
                  disabled={isMe}
                  className={`w-full flex items-center gap-md px-lg py-sm text-left
                    transition-colors duration-fast
                    ${isMe ? "opacity-90 cursor-default" : "hover:bg-subtle/60"}`}
                >
                  <Avatar name={m.name} src={m.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-bodySm text-fg font-medium truncate flex items-center gap-sm">
                      {m.name}
                      {isMe && (
                        <span className="text-caption text-fg-subtle">(you)</span>
                      )}
                    </p>
                    {designation && (
                      <p className="text-caption text-fg-subtle truncate capitalize">
                        {designation}
                      </p>
                    )}
                  </div>
                  {!isMe && (
                    <span className="text-caption text-accent shrink-0 opacity-0 group-hover:opacity-100">
                      Message
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
};

const ChatDetailsPanel = ({
  conversation,
  employees,
  currentUserId,
  onClose,
  onStartDm,
}) => {
  if (!conversation) return null;

  const peerEmployee =
    conversation.type === "dm" && conversation.peer
      ? (employees || []).find((e) => e.id === conversation.peer.id)
      : null;

  return (
    <aside className="h-full flex flex-col bg-surface border-l border-line-subtle min-w-0">
      <div className="shrink-0 flex items-center justify-between gap-md px-md py-md border-b border-line-subtle">
        <div className="flex items-center gap-sm min-w-0">
          {conversation.type === "dm" ? (
            <User className="h-4 w-4 text-fg-subtle shrink-0" />
          ) : (
            <Users className="h-4 w-4 text-fg-subtle shrink-0" />
          )}
          <h2 className="text-section text-fg truncate">
            {conversation.type === "dm" ? "Contact" : "Channel info"}
          </h2>
        </div>
        {onClose && (
          <IconButton
            icon={X}
            size="sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Close details"
          />
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {conversation.type === "dm" ? (
          <DmDetails peer={conversation.peer} employee={peerEmployee} />
        ) : (
          <ChannelDetails
            conversation={conversation}
            employees={employees}
            currentUserId={currentUserId}
            onStartDm={onStartDm}
          />
        )}
      </div>
    </aside>
  );
};

export default ChatDetailsPanel;
