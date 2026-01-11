import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Calendar, GraduationCap } from "lucide-react";

export default function ClassroomCard({ classroom, onClick }) {
  return (
    <Card
      onClick={() => onClick(classroom)}
      className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] overflow-hidden"
    >
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white line-clamp-1">
                {classroom.name}
              </h3>
              {classroom.description && (
                <p className="text-purple-100 text-sm mt-1 line-clamp-1">
                  {classroom.description}
                </p>
              )}
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-0">Active</Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Teacher */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-600">Teacher</p>
            <p className="text-sm font-semibold text-gray-900">
              {classroom.teacher?.name || "N/A"}
            </p>
          </div>
        </div>

        {/* Total Students */}
        <div className="flex items-center gap-2">
          <div className="bg-green-100 p-2 rounded-lg">
            <Users className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-600">Students</p>
            <p className="text-sm font-semibold text-gray-900">
              {classroom.total_students} enrolled
            </p>
          </div>
        </div>

        {/* Enrolled Date */}
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-600">Enrolled</p>
            <p className="text-sm font-semibold text-gray-900">
              {new Date(classroom.enrolled_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
