import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { VoiceRecordingCard, VoiceTemplate, RecordedSample } from './VoiceRecordingCard';
import { cn } from '@/lib/utils';

interface SwipeVoiceCollectionProps {
  templates: VoiceTemplate[];
  recordedSamples: RecordedSample[];
  selectedCategory: string;
  categories: string[];
  categoryMapping: Record<string, string>;
  onCategoryChange: (category: string) => void;
  onRecord: (modulationKey: string, audioBlob: Blob) => Promise<void>;
  onPlayRecorded?: (audioUrl: string) => void;
  className?: string;
}

export function SwipeVoiceCollection({
  templates,
  recordedSamples,
  selectedCategory,
  categories,
  categoryMapping,
  onCategoryChange,
  onRecord,
  onPlayRecorded,
  className
}: SwipeVoiceCollectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filter templates by current category
  const filteredTemplates = templates.filter(t => t.modulationType === selectedCategory);
  
  // Reset index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  const isModulationRecorded = (modulationKey: string): boolean => {
    return recordedSamples.some(sample => sample.modulationKey === modulationKey);
  };

  const getRecordedSample = (modulationKey: string): RecordedSample | undefined => {
    return recordedSamples.find(sample => sample.modulationKey === modulationKey);
  };

  const goToNext = () => {
    if (currentIndex < filteredTemplates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < filteredTemplates.length) {
      setCurrentIndex(index);
    }
  };

  // Touch/Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!startX || !currentX) {
      setStartX(null);
      setCurrentX(null);
      setIsDragging(false);
      return;
    }

    const diffX = startX - currentX;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
    }

    setStartX(null);
    setCurrentX(null);
    setIsDragging(false);
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startX || !isDragging) return;
    setCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!startX || !currentX) {
      setStartX(null);
      setCurrentX(null);
      setIsDragging(false);
      return;
    }

    const diffX = startX - currentX;
    const threshold = 50;

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    setStartX(null);
    setCurrentX(null);
    setIsDragging(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredTemplates.length]);

  if (filteredTemplates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No templates available for this category.</p>
      </div>
    );
  }

  const currentTemplate = filteredTemplates[currentIndex];
  const recordedSample = getRecordedSample(currentTemplate.modulationKey);
  const isRecorded = isModulationRecorded(currentTemplate.modulationKey);

  // Calculate progress for current category
  const recordedCount = filteredTemplates.filter(t => isModulationRecorded(t.modulationKey)).length;
  const totalCount = filteredTemplates.length;

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Category Navigation */}
      <div className="flex justify-center gap-2 mb-6">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="text-xs sm:text-sm"
          >
            {categoryMapping[category]}
          </Button>
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {currentIndex + 1} of {totalCount}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {categoryMapping[selectedCategory]}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {recordedCount}/{totalCount} recorded
        </div>
      </div>

      {/* Main Card with Swipe */}
      <div
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <VoiceRecordingCard
          template={currentTemplate}
          recordedSample={recordedSample}
          isRecorded={isRecorded}
          onRecord={onRecord}
          onPlayRecorded={onPlayRecorded}
          className="w-full"
        />
        
        {/* Swipe Overlay Hint */}
        {isDragging && currentX && startX && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-white px-3 py-1 rounded text-sm">
              {startX - currentX > 0 ? 'Swipe to see next' : 'Swipe to see previous'}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        {/* Dot Indicators */}
        <div className="flex gap-1">
          {filteredTemplates.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentIndex
                  ? "bg-primary"
                  : isModulationRecorded(filteredTemplates[index].modulationKey)
                  ? "bg-green-500"
                  : "bg-muted"
              )}
              aria-label={`Go to ${filteredTemplates[index].displayName}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={currentIndex === filteredTemplates.length - 1}
          className="flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile Swipe Instructions */}
      <div className="text-center mt-4 text-xs text-muted-foreground sm:hidden">
        Swipe left or right to navigate • Tap dots to jump to specific items
      </div>
    </div>
  );
}