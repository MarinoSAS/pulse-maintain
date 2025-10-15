import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    console.log('Processing invoice:', filePath);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Create Supabase client to get signed URL
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get signed URL for the file
    const { data: urlData, error: urlError } = await supabase.storage
      .from('invoices')
      .createSignedUrl(filePath, 300); // 5 minutes

    if (urlError || !urlData?.signedUrl) {
      console.error('Error creating signed URL:', urlError);
      throw new Error('Failed to access invoice file');
    }

    console.log('Generated signed URL for invoice');

    // Call Lovable AI with the invoice image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this invoice image and extract the following information:
- Net amount / Subtotal BEFORE VAT/tax (numeric value only, no currency symbols)
  - Look for labels like: "Subtotal", "Net Amount", "Amount before VAT", "Netto", "Sub Total"
  - If only the total with VAT is visible, extract that but note it in the description
- VAT/Tax amount (if shown separately)
- Total amount including VAT (if different from subtotal)
- Invoice date (in YYYY-MM-DD format)
- Vendor/supplier name
- Invoice number
- Service description (brief, 1-2 sentences)
- Service type (must be one of: Service, Oil Change, MOT, Tachograph, Speed Limiter, Repair, Brake Service, Tire Replacement, Parts Replacement, Inspection, Other)
- Asset identifier (vehicle registration/license plate, asset ID, or reference number if visible)
- Asset description (vehicle make/model or asset description if visible)

Prioritize extracting the net/subtotal amount. Return null for fields that are unclear or missing.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: urlData.signedUrl
                }
              }
            ]
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_invoice_data',
            description: 'Extract structured data from an invoice',
            parameters: {
              type: 'object',
              properties: {
                amount: { 
                  type: 'number',
                  description: 'The net amount BEFORE VAT/tax (subtotal). If only total is visible, extract the total.'
                },
                vat_amount: { 
                  type: 'number',
                  description: 'VAT/tax amount if visible on invoice'
                },
                total_amount: { 
                  type: 'number',
                  description: 'Total amount including VAT if different from net amount'
                },
                date: { 
                  type: 'string',
                  description: 'Invoice date in YYYY-MM-DD format'
                },
                vendor_name: { 
                  type: 'string',
                  description: 'Name of the vendor or supplier'
                },
                invoice_number: { 
                  type: 'string',
                  description: 'Invoice number or reference'
                },
                description: { 
                  type: 'string',
                  description: 'Brief description of the service or items'
                },
                service_type: { 
                  type: 'string',
                  enum: ['Service', 'Oil Change', 'MOT', 'Tachograph', 'Speed Limiter', 'Repair', 'Brake Service', 'Tire Replacement', 'Parts Replacement', 'Inspection', 'Other'],
                  description: 'Type of service performed'
                },
                asset_identifier: { 
                  type: 'string',
                  description: 'Vehicle registration, license plate, or asset ID if visible on invoice'
                },
                asset_description: { 
                  type: 'string',
                  description: 'Vehicle make/model or asset description if visible'
                }
              },
              required: ['amount', 'date', 'service_type'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { 
          type: 'function', 
          function: { name: 'extract_invoice_data' } 
        }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI service requires payment. Please add credits to your workspace.');
      }
      if (aiResponse.status === 400) {
        try {
          const errorBody = JSON.parse(errorText);
          if (errorBody.error?.message?.includes('Failed to extract')) {
            throw new Error('Unable to process this file type. Please use JPG, PNG, or WEBP images only.');
          }
        } catch (e) {
          // If parsing fails, continue with generic error
        }
      }
      throw new Error('Failed to analyze invoice with AI');
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData, null, 2));

    if (!aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      throw new Error('Invalid AI response format');
    }

    const extractedData = JSON.parse(
      aiData.choices[0].message.tool_calls[0].function.arguments
    );

    console.log('Extracted data:', extractedData);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in parse-invoice function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
