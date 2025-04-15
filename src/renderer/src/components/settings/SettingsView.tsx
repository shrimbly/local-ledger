import { ApiKeySettings } from './ApiKeySettings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

export function SettingsView() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-keys">
          <div className="space-y-6">
            <ApiKeySettings />
          </div>
        </TabsContent>
        
        <TabsContent value="appearance">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-gray-500 italic">Appearance settings coming soon</p>
          </div>
        </TabsContent>
        
        <TabsContent value="data">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-gray-500 italic">Data management settings coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 