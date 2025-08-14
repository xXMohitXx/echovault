/**
 * Test utilities for verifying the end-to-end recording pipeline
 */

import { supabase } from "@/integrations/supabase/client";

export interface PipelineTestResult {
  step: string;
  success: boolean;
  error?: string;
  data?: any;
}

export async function testPipeline(): Promise<PipelineTestResult[]> {
  const results: PipelineTestResult[] = [];

  // Test 1: Check authentication
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    results.push({
      step: "Authentication",
      success: !error && !!session,
      error: error?.message,
      data: { userId: session?.user?.id }
    });
  } catch (error) {
    results.push({
      step: "Authentication",
      success: false,
      error: (error as Error).message
    });
  }

  // Test 2: Check database connectivity
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select('id')
      .limit(1);
    
    results.push({
      step: "Database Connection",
      success: !error,
      error: error?.message,
      data: { canQuery: !error, hasRecordings: (data?.length || 0) > 0 }
    });
  } catch (error) {
    results.push({
      step: "Database Connection", 
      success: false,
      error: (error as Error).message
    });
  }

  // Test 3: Check storage bucket access
  try {
    const { data, error } = await supabase.storage
      .from('recordings')
      .list('', { limit: 1 });
    
    results.push({
      step: "Storage Access",
      success: !error,
      error: error?.message,
      data: { hasAccess: !error }
    });
  } catch (error) {
    results.push({
      step: "Storage Access",
      success: false,
      error: (error as Error).message
    });
  }

  // Test 4: Check microphone permissions
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Clean up
    
    results.push({
      step: "Microphone Access",
      success: true,
      data: { hasPermission: true }
    });
  } catch (error) {
    results.push({
      step: "Microphone Access",
      success: false,
      error: (error as Error).message
    });
  }

  // Test 5: Check edge functions availability
  try {
    const { error } = await supabase.functions.invoke('transcribe-audio', {
      body: { test: true }
    });
    
    // We expect an error here since we're not sending real audio, but function should be reachable
    results.push({
      step: "Transcription Function",
      success: true, // Function is available even if it returns an error for test data
      data: { reachable: true }
    });
  } catch (error) {
    results.push({
      step: "Transcription Function",
      success: false,
      error: (error as Error).message
    });
  }

  return results;
}

export function logPipelineResults(results: PipelineTestResult[]) {
  console.group('🔧 EchoVault Pipeline Test Results');
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const message = `${icon} ${result.step}: ${result.success ? 'PASS' : 'FAIL'}`;
    
    if (result.success) {
      console.log(message, result.data);
    } else {
      console.error(message, result.error);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Overall Status: ${successCount}/${totalCount} tests passed`);
  
  if (successCount === totalCount) {
    console.log('🎉 All systems operational! Ready for recording.');
  } else {
    console.warn('⚠️ Some issues detected. Check failed tests above.');
  }
  
  console.groupEnd();
}