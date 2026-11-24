import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { roles } from "./constants/roles"

const RoleSelection = ({ onRoleSelect }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Choose Your Role</CardTitle>
            <CardDescription>
              Select the role that best describes your position in the Web3 ecosystem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => {
                const Icon = role.icon
                return (
                  <Card
                    key={role.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-200"
                    onClick={() => onRoleSelect(role.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div
                        className={`w-12 h-12 ${role.color} rounded-full flex items-center justify-center mx-auto mb-3`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg">{role.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RoleSelection