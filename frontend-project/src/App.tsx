import { Router, Route, Switch } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Navbar } from '@/components/navbar';
import { LandingPage } from '@/pages/landing';
import { HomePage } from '@/pages/home';
import { StoriesPage } from '@/pages/stories';
import { StoryDetailPage } from '@/pages/story-detail';
import { ProfilePage } from '@/pages/profile';
import { LoginPage } from '@/pages/login';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        {isAuthenticated && <Navbar />}
        
        <main className={isAuthenticated ? "pt-16" : ""}>
          <Switch>
            <Route path="/" component={isAuthenticated ? HomePage : LandingPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/stories" component={StoriesPage} />
            <Route path="/stories/:id" component={StoryDetailPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route>
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
                  <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
                </div>
              </div>
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;