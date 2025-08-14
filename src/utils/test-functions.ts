import { supabase } from "@/integrations/supabase/client";

/**
 * Test the transcription function with a small audio sample
 */
export async function testTranscriptionFunction() {
  console.log('🧪 Testing transcription function...');
  
  try {
    // Create a minimal test audio blob (silent audio)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = 22050;
    const duration = 0.5; // 0.5 seconds
    const arrayBuffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    
    // Fill with minimal audio data (very quiet tone)
    const channelData = arrayBuffer.getChannelData(0);
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.01; // Very quiet 440Hz tone
    }
    
    // Convert to WAV format (simplified)
    const testAudioBase64 = "UklGRiYAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQIAAAAA"; // Minimal WAV header
    
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audio: testAudioBase64 }
    });
    
    if (error) {
      console.error('❌ Transcription test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Transcription test passed:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Transcription test error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Test the analysis function with sample text
 */
export async function testAnalysisFunction() {
  console.log('🧪 Testing analysis function...');
  
  try {
    const testText = "Hello, this is a test recording about planning a team meeting for next week. We need to discuss the new product launch and marketing strategy.";
    
    const { data, error } = await supabase.functions.invoke('analyze-recording', {
      body: { text: testText }
    });
    
    if (error) {
      console.error('❌ Analysis test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Analysis test passed:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Analysis test error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Test both functions in sequence
 */
export async function testCompletePipeline() {
  console.group('🚀 Testing Complete Pipeline');
  
  const transcriptionResult = await testTranscriptionFunction();
  const analysisResult = await testAnalysisFunction();
  
  const overallSuccess = transcriptionResult.success && analysisResult.success;
  
  console.log('\n📊 Pipeline Test Results:');
  console.log('Transcription:', transcriptionResult.success ? '✅ PASS' : '❌ FAIL');
  console.log('Analysis:', analysisResult.success ? '✅ PASS' : '❌ FAIL');
  console.log('Overall:', overallSuccess ? '✅ READY' : '❌ NEEDS FIXING');
  
  console.groupEnd();
  
  return {
    transcription: transcriptionResult,
    analysis: analysisResult,
    overall: overallSuccess
  };
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testTranscription = testTranscriptionFunction;
  (window as any).testAnalysis = testAnalysisFunction;
  (window as any).testPipeline = testCompletePipeline;
}