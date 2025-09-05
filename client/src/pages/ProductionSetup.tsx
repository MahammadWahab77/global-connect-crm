import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Database } from 'lucide-react';

const ProductionSetup = () => {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<any>(null);

  const seedProductionUsers = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch('/api/auth/seed-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminKey: 'SEED_PRODUCTION_USERS_2025'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to seed users: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      
      toast({
        title: "Success!",
        description: data.message,
      });
    } catch (error) {
      console.error('Seeding error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to seed users',
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Production Setup</h1>
          <p className="text-gray-600">Setup authentication accounts for production environment.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Seed Production Users
            </CardTitle>
            <CardDescription>
              This will create all necessary user accounts in the production database with the standard password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Users to be created:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Admin User (gundluru.mahammadwahab@nxtwave.co.in) - Admin</li>
                  <li>• Anupriya (angupriya.bharaththangam@nxtwave.co.in) - Admin</li>
                  <li>• Likitha (likhitha.nyasala@nxtwave.co.in) - Counselor</li>
                  <li>• BASHIR SHAIK (bashir.shaik@nxtwave.co.in) - Counselor</li>
                  <li>• Sanjana (madishetti.sanjana@nxtwave.tech) - Counselor</li>
                  <li>• Varsha (keesari.varsha@nxtwave.tech) - Counselor</li>
                  <li>• Priyanka (tiruveedula.priyanka@nxtwave.tech) - Counselor</li>
                </ul>
                <p className="mt-3 text-sm font-medium text-blue-900">
                  All accounts will have password: <code className="bg-blue-100 px-2 py-1 rounded">Nxtwave@1234</code>
                </p>
              </div>
              
              <Button 
                onClick={seedProductionUsers}
                disabled={isSeeding}
                className="w-full"
                data-testid="button-seed-users"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Users...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Seed Production Users
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Seeding Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-green-600">{results.message}</p>
                <p className="text-sm text-gray-600">{results.note}</p>
                
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">User Status:</h3>
                  <div className="space-y-1">
                    {results.results?.map((result: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{result.name} ({result.email})</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          result.status === 'created' ? 'bg-green-100 text-green-800' :
                          result.status === 'already_exists' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductionSetup;