import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast, toastMessages } from "@/lib/toast-utils";
import { apiRequest } from "@/lib/queryClient";
import { insertCharacterSchema } from '@shared/schema/schema';
import { X, Camera } from "lucide-react";

const categories = ["Fantasy", "Sci-Fi", "Romance", "Adventure", "Mentor", "Comedy"];
const backgrounds = [
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=800",
  "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=800",
  "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=800"
];

export default function CreateCharacter() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBackground, setSelectedBackground] = useState<string>(backgrounds[0]);

  const form = useForm({
    resolver: zodResolver(insertCharacterSchema),
    defaultValues: {
      name: "",
      title: "",
      description: "",
      personality: "",
      greeting: "",
      category: "",
      avatar: "https://images.unsplash.com/photo-1569913486515-b74bf7751574?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
      background: backgrounds[0],
    },
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/characters", data);
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Your character has been added to the feed.");
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create character. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createCharacterMutation.mutate({
      ...data,
      category: selectedCategory,
      background: selectedBackground,
    });
  };

  return (
    <div className="bg-dark-bg text-dark-text min-h-screen">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-dark-card border-b border-gray-800">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            className="text-dark-text hover:bg-gray-800"
          >
            <X className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-semibold">Create Character</h2>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={createCharacterMutation.isPending}
            className="bg-tiktok-red hover:bg-tiktok-red/80 text-white font-semibold"
          >
            {createCharacterMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar */}
              <div className="text-center">
                <div className="relative inline-block">
                  <img 
                    src={form.watch("avatar")}
                    alt="Character Avatar" 
                    className="w-24 h-24 rounded-full mx-auto border-4 border-tiktok-cyan object-cover"
                  />
                  <Button 
                    type="button"
                    size="icon"
                    className="absolute bottom-0 right-0 bg-tiktok-red hover:bg-tiktok-red/80 rounded-full w-8 h-8"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-text mt-2">Tap to change avatar</p>
              </div>

              {/* Character Details */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dark-text">Character Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="Enter character name..."
                        className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dark-text">Character Title</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="e.g., Wise Mentor, Space Explorer..."
                        className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dark-text">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="Brief description that appears on the character card..."
                        className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan h-24 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dark-text">Personality</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="Describe your character's personality, background, and speaking style..."
                        className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan h-32 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="greeting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-dark-text">Greeting Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="What will your character say when someone starts chatting?"
                        className="bg-gray-800 text-dark-text border-gray-700 focus:border-tiktok-cyan h-24 resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedCategory(category)}
                      className={`border-gray-700 text-sm transition-colors ${
                        selectedCategory === category
                          ? "bg-tiktok-red/20 border-tiktok-red text-tiktok-red"
                          : "bg-gray-800 hover:bg-tiktok-red/20 hover:border-tiktok-red text-dark-text"
                      }`}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Background Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">Background Scene</label>
                <div className="grid grid-cols-3 gap-2">
                  {backgrounds.map((bg, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedBackground(bg)}
                      className={`aspect-square p-0 overflow-hidden border-2 transition-colors ${
                        selectedBackground === bg
                          ? "border-tiktok-cyan"
                          : "border-transparent hover:border-tiktok-cyan"
                      }`}
                    >
                      <img 
                        src={bg}
                        alt={`Background ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
