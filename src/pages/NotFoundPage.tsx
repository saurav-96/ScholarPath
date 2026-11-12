import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { Button, Card } from '@/components/ui/Primitives';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <PageMeta
        title="Page Not Found"
        description="The requested ScholarPath page could not be found."
      />
      <Card className="space-y-4 p-8">
        <Compass className="mx-auto h-10 w-10 text-accent-primary" />
        <h1 className="font-display text-2xl font-bold text-text-primary">
          404 — Page Not Found
        </h1>
        <p className="text-sm text-text-secondary">
          The requested ScholarPath route does not exist or may have moved. Explore verified
          undergraduate scholarships or return to the homepage.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="outline">
              <Home className="h-4 w-4" />
              Back Home
            </Button>
          </Link>
          <Link to="/scholarships">
            <Button>Explore Scholarships</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
