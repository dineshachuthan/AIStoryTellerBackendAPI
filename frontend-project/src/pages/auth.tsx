import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/language-context';
import { UIMessages } from '@/config/i18n-config';
import { apiClient } from '@/lib/api-client';
import { toast, toastMessages } from '@/lib/toast-utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { EyeIcon, EyeOffIcon, Loader2 } from 'lucide-react';

// Password validation regex
const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;

// Login form schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});

// Register form schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8)
    .max(12)
    .regex(passwordRegex, UIMessages.auth.password.requirements),
  confirmPassword: z.string(),
  passwordHint: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: UIMessages.auth.register.termsRequired,
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: UIMessages.auth.register.passwordMismatch,
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      passwordHint: '',
      acceptTerms: false,
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => apiClient.auth.login(data),
    onSuccess: async () => {
      toast.success(toastMessages.auth.loginSuccess);
      
      // Track login history with default emotion
      await apiClient.user.updateEmotion('neutral', 'login');
      
      setLocation('/');
    },
    onError: (error: any) => {
      toast.error(toastMessages.auth.loginFailed);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterFormData) => apiClient.auth.register(data),
    onSuccess: () => {
      toast.success(toastMessages.auth.registerSuccess);
      setActiveTab('login');
      loginForm.setValue('email', registerForm.getValues('email'));
    },
    onError: (error: any) => {
      toast.error(toastMessages.auth.registerFailed);
    },
  });

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    
    const labels = ['', UIMessages.auth.register.passwordStrength.weak, UIMessages.auth.register.passwordStrength.medium, UIMessages.auth.register.passwordStrength.strong, UIMessages.auth.register.passwordStrength.strong];
    const colors = ['', 'text-red-500', 'text-yellow-500', 'text-green-500', 'text-green-500'];
    
    return { strength, label: labels[strength], color: colors[strength] };
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{UIMessages.getTitle('APP_NAME')}</CardTitle>
          <CardDescription>
            {activeTab === 'login' ? UIMessages.auth.login.description : UIMessages.auth.register.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{UIMessages.auth.login.title}</TabsTrigger>
              <TabsTrigger value="register">{UIMessages.auth.register.title}</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{UIMessages.auth.login.email.label}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={UIMessages.auth.login.email.placeholder}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{UIMessages.auth.login.password.label}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder={UIMessages.auth.login.password.placeholder}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOffIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{UIMessages.auth.login.rememberMe}</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                      {UIMessages.auth.login.forgotPassword}
                    </Link>
                  </div>

                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {UIMessages.auth.login.submit}
                  </Button>
                </form>
              </Form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {UIMessages.auth.login.orContinueWith}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = '/api/login'}
                  >
                    {UIMessages.auth.login.continueWithGoogle}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{UIMessages.auth.register.email.label}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={UIMessages.auth.register.email.placeholder}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{UIMessages.auth.register.password.label}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder={UIMessages.auth.register.password.placeholder}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOffIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>{UIMessages.auth.password.requirements}</FormDescription>
                        {field.value && (
                          <div className={`text-sm ${getPasswordStrength(field.value).color}`}>
                            {getPasswordStrength(field.value).label}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{UIMessages.auth.register.confirmPassword.label}</FormLabel>
                        <FormControl>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder={UIMessages.auth.register.confirmPassword.placeholder}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="passwordHint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{UIMessages.auth.register.passwordHint.label}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={UIMessages.auth.register.passwordHint.placeholder}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{UIMessages.auth.register.passwordHint.description}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            {UIMessages.auth.register.acceptTerms}{' '}
                            <Link href="/terms" className="text-primary hover:underline">
                              {UIMessages.auth.register.termsLink}
                            </Link>
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {UIMessages.auth.register.submit}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}