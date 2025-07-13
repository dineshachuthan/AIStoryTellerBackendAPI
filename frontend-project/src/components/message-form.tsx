import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast-utils';
import { Loader2, MessageCircle, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const messageFormSchema = z.object({
  to: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'),
  message: z.string()
    .min(1, 'Message is required')
    .max(1600, 'Message must be less than 1600 characters'),
  messageType: z.enum(['sms', 'whatsapp']),
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

export function MessageForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      to: '',
      message: '',
      messageType: 'sms',
    },
  });

  const onSubmit = async (values: MessageFormValues) => {
    setIsSubmitting(true);
    
    try {
      let result;
      
      if (values.messageType === 'sms') {
        result = await apiClient.sms.send({
          to: values.to,
          message: values.message,
        });
      } else {
        result = await apiClient.whatsapp.send({
          to: values.to,
          message: values.message,
        });
      }

      if (result.success) {
        toast.success(`${values.messageType === 'sms' ? 'SMS' : 'WhatsApp'} message sent successfully!`);
        form.reset();
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Message send error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const messageType = form.watch('messageType');
  const messageLength = form.watch('message')?.length || 0;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {messageType === 'sms' ? (
            <Phone className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
          Send {messageType === 'sms' ? 'SMS' : 'WhatsApp'} Message
        </CardTitle>
        <CardDescription>
          Send messages to your users via SMS or WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="messageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          SMS
                        </div>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+1234567890" 
                      {...field} 
                      type="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Message
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({messageLength}/1600)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your message here..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>Send {messageType === 'sms' ? 'SMS' : 'WhatsApp'} Message</>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}