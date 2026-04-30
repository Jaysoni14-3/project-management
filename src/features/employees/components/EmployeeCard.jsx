import { BiEnvelope, BiLogoWhatsapp, BiPhoneOutgoing } from "react-icons/bi";
import { Link } from "react-router-dom";
import EditButton from "../../../components/ui/EditButton";
import DeleteButton from "../../../components/ui/DeleteButton";
import { auth } from "../../../services/firebase";


const EmployeeCard = ({ employees, onEditUser, userIdToNameMap, onDeleteUser, projectsLoading }) => {
    return (
        <>
            {employees.map((emp) => (
                <div
                    key={emp.id}
                    className=" employee-card group relative border rounded-sm shadow-card bg-white flex flex-col gap-sm hover:shadow-md transition"
                >
                    {/* Avatar */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="avatar h-40 w-full overflow-hidden rounded-tr-sm rounded-tl-sm bg-primary text-accent-hover bg-blue-50 flex items-center justify-center font-semibold">
                            {emp.avatar ? <img src={`/images/${emp.avatar}`} alt={emp.name} className="w-full h-full object-contain" /> : emp.name.charAt(0)}
                        </div>
                    </div>

                    <div className="pill absolute top-2 right-2">
                        {/* Only show MANAGER AND ADMIN pill */}
                        {emp.role == "manager" &&
                            <span className={`text-xs px-2 py-1 rounded-full capitalize bg-blue-100 text-blue-900`}>{emp.role}</span>
                        }

                        {emp.role == "admin" &&
                            <span className={`text-xs px-2 py-1 rounded-full capitalize bg-red-100 text-red-900`}>{emp.role}</span>
                        }
                    </div>

                    <div className="text-sm text-text-secondary flex flex-col items-start gap-2 px-3">
                        {/* Employee name and manager name */}
                        <div className="employee-name w-full flex justify-center items-center gap-sm">
                            <div className="username">
                                <h3 className="text-lg text-text-primary text-center font-medium capitalize">
                                    {emp.name}
                                </h3>
                                <p className="text-sm text-gray-400 text-center capitalize">{emp.designation}</p>
                            </div>
                        </div>

                        <div className="manager-name">
                            <p className="text-sm text-gray-400 capitalize">
                                {/* Manager: <span className="text-gray-700">{emp.managerID}</span> */}
                                Manager:{" "}
                                <span className="text-gray-700">
                                    {emp.managerID
                                        ? userIdToNameMap[emp.managerID] || "—"
                                        : "—"}
                                </span>
                            </p>
                        </div>
                        <div className="projects">
                            <p className="text-sm text-gray-400 capitalize">
                                Projects: <span className="text-gray-700">
                                    {projectsLoading
                                        ? "Loading projects..."
                                        : emp.assignedProjects?.length > 0
                                            ? emp.assignedProjects
                                                .map((project) => project.name)
                                                .join(", ")
                                            : "No projects assigned"}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-sm px-3 pb-3">

                        <div className="contact-details flex gap-sm">
                            <Link target="_blank" rel="noopener noreferrer" to={`mailto:${emp.email}`} className="mail flex items-center rounded-full p-2 bg-red-100">
                                <BiEnvelope />
                            </Link>
                            <Link target="_blank" rel="noopener noreferrer" to={`https://wa.me/${emp.whatsapp}`} className="whatsapp flex items-center rounded-full p-2 bg-green-100">
                                <BiLogoWhatsapp />
                            </Link>
                            <Link target="_blank" rel="noopener noreferrer" to={`tel:${emp.phoneNumber}`} className="call flex items-center rounded-full p-2 bg-blue-100">
                                <BiPhoneOutgoing />
                            </Link>
                        </div>

                        <span className="text-xs text-text-secondary">
                            Joined: {emp.joinedDate
                                ? new Date(emp.joinedDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })
                                : "-"}
                        </span>
                    </div>
                    <div className="action-buttons absolute top-2 right-2 z-20 rounded-md bg-white p-2 gap-2 flex opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200">
                        {emp.id !== auth.currentUser.uid && (
                            <EditButton onClick={(e) => {
                                e.stopPropagation();
                                onEditUser(emp)
                            }} />
                        )}
                        <DeleteButton onClick={(e) => {
                            e.stopPropagation()
                            onDeleteUser(emp)
                        }} />
                    </div>

                </div>
            ))}

        </>
    );
};

export default EmployeeCard;
