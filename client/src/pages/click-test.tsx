/* FIX: Smoke test page to verify button clickability across all variants
 * Access at /click-test to verify all interactive elements work correctly
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, X, Zap } from "lucide-react";

export default function ClickTestPage() {
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [testsPassed, setTestsPassed] = useState<Record<string, boolean>>({});

  const handleClick = (testId: string) => {
    setClickCounts(prev => ({ ...prev, [testId]: (prev[testId] || 0) + 1 }));
    setTestsPassed(prev => ({ ...prev, [testId]: true }));
    console.log(`✅ ${testId} clicked successfully`);
  };

  const allTests = [
    'default-button',
    'secondary-button',
    'outline-button',
    'ghost-button',
    'destructive-button',
    'link-button',
    'icon-button',
    'disabled-button',
    'badge-click',
    'dialog-button',
    'checkbox',
    'switch',
    'input-submit'
  ];

  const passedCount = Object.keys(testsPassed).length;
  const totalTests = allTests.length - 1; // Excluding disabled button

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* FIX: Header with debug mode toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🧪 Button Clickability Smoke Test</span>
              <Badge variant={passedCount === totalTests ? "default" : "secondary"}>
                {passedCount}/{totalTests} Tests Passed
              </Badge>
            </CardTitle>
            <CardDescription>
              Click each element below to verify clickability. 
              Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Shift+D</kbd> to enable Click Debug Mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-center">
              <Button 
                onClick={() => (window as any).toggleClickDebug?.()}
                variant="outline"
                data-testid="button-toggle-debug"
              >
                <Zap className="w-4 h-4 mr-2" />
                Toggle Click Debug Mode
              </Button>
              <Button 
                onClick={() => {
                  setClickCounts({});
                  setTestsPassed({});
                }}
                variant="ghost"
                data-testid="button-reset-tests"
              >
                Reset Tests
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FIX: Button variants test */}
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>Test all button variants for clickability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Button 
                  onClick={() => handleClick('default-button')}
                  className="w-full"
                  data-testid="button-default"
                >
                  Default {testsPassed['default-button'] && <Check className="ml-2 w-4 h-4" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicks: {clickCounts['default-button'] || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => handleClick('secondary-button')}
                  variant="secondary"
                  className="w-full"
                  data-testid="button-secondary"
                >
                  Secondary {testsPassed['secondary-button'] && <Check className="ml-2 w-4 h-4" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicks: {clickCounts['secondary-button'] || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => handleClick('outline-button')}
                  variant="outline"
                  className="w-full"
                  data-testid="button-outline"
                >
                  Outline {testsPassed['outline-button'] && <Check className="ml-2 w-4 h-4" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicks: {clickCounts['outline-button'] || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => handleClick('ghost-button')}
                  variant="ghost"
                  className="w-full"
                  data-testid="button-ghost"
                >
                  Ghost {testsPassed['ghost-button'] && <Check className="ml-2 w-4 h-4" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicks: {clickCounts['ghost-button'] || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => handleClick('destructive-button')}
                  variant="destructive"
                  className="w-full"
                  data-testid="button-destructive"
                >
                  Destructive {testsPassed['destructive-button'] && <Check className="ml-2 w-4 h-4" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicks: {clickCounts['destructive-button'] || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => handleClick('link-button')}
                  variant="link"
                  className="w-full"
                  data-testid="button-link"
                >
                  Link {testsPassed['link-button'] && <Check className="ml-2 w-4 h-4" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicks: {clickCounts['link-button'] || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => handleClick('icon-button')}
                  size="icon"
                  className="w-full"
                  data-testid="button-icon"
                >
                  {testsPassed['icon-button'] ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Clicks: {clickCounts['icon-button'] || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  disabled
                  className="w-full"
                  data-testid="button-disabled"
                >
                  Disabled <X className="ml-2 w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Should not click
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FIX: Interactive components test */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Components</CardTitle>
            <CardDescription>Test form controls and other interactive elements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Badge 
                onClick={() => handleClick('badge-click')}
                className="cursor-pointer"
                data-testid="badge-clickable"
              >
                Clickable Badge {testsPassed['badge-click'] && <Check className="ml-2 w-3 h-3" />}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Clicks: {clickCounts['badge-click'] || 0}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Checkbox 
                onCheckedChange={() => handleClick('checkbox')}
                data-testid="checkbox-test"
              />
              <label className="text-sm">
                Checkbox {testsPassed['checkbox'] && <Check className="inline w-4 h-4 ml-2" />}
              </label>
              <p className="text-sm text-muted-foreground">
                Clicks: {clickCounts['checkbox'] || 0}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Switch 
                onCheckedChange={() => handleClick('switch')}
                data-testid="switch-test"
              />
              <label className="text-sm">
                Switch {testsPassed['switch'] && <Check className="inline w-4 h-4 ml-2" />}
              </label>
              <p className="text-sm text-muted-foreground">
                Toggles: {clickCounts['switch'] || 0}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <form onSubmit={(e) => { e.preventDefault(); handleClick('input-submit'); }}>
                <Input 
                  type="submit" 
                  value={`Submit Button ${testsPassed['input-submit'] ? '✓' : ''}`}
                  data-testid="input-submit-test"
                />
              </form>
              <p className="text-sm text-muted-foreground">
                Clicks: {clickCounts['input-submit'] || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FIX: Dialog test for z-index issues */}
        <Card>
          <CardHeader>
            <CardTitle>Modal & Overlay Tests</CardTitle>
            <CardDescription>Test dialog clickability and z-index handling</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => handleClick('dialog-button')}
                  data-testid="button-open-dialog"
                >
                  Open Dialog {testsPassed['dialog-button'] && <Check className="ml-2 w-4 h-4" />}
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-content">
                <DialogHeader>
                  <DialogTitle>Dialog Test</DialogTitle>
                  <DialogDescription>
                    If you can see this and click the close button, the dialog is working correctly.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm">
                    Dialog opened: {clickCounts['dialog-button'] || 0} times
                  </p>
                  <Button 
                    onClick={() => console.log('Dialog button clicked')}
                    className="w-full"
                    data-testid="button-inside-dialog"
                  >
                    Button Inside Dialog
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <p className="text-sm text-muted-foreground mt-2">
              Dialog opens: {clickCounts['dialog-button'] || 0}
            </p>
          </CardContent>
        </Card>

        {/* FIX: Results summary */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allTests.filter(t => t !== 'disabled-button').map(testId => (
                <div key={testId} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-sm font-mono">{testId}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {clickCounts[testId] || 0} clicks
                    </span>
                    {testsPassed[testId] ? (
                      <Badge variant="default">
                        <Check className="w-3 h-3 mr-1" /> Passed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
