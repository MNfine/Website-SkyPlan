"""
AI Chat API using Google Gemini
"""
from flask import Blueprint, request, jsonify
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables - try multiple paths
# First try from root directory (where app.py is)
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(root_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    # Fallback: try current directory
    load_dotenv()

ai_chat_bp = Blueprint('ai_chat', __name__)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("[AI Chat] ⚠️ WARNING: Gemini API key not found!")

# Model configuration - try multiple models with fallback
# Priority: stable models (non-exp/preview) first for better free tier quota
AVAILABLE_MODELS = [
	"gemini-2.5-flash",           # Latest stable flash (best free tier)
	"gemini-2.0-flash",           # Stable flash (good free tier)
	"gemini-flash-latest",        # Latest stable (auto-updates)
	"gemini-1.5-flash",           # Older stable flash
	"gemini-2.5-flash-lite",      # Lite version (more quota)
	"gemini-2.0-flash-lite",      # Lite version
	"gemini-1.5-pro",             # Pro version
	"gemini-pro-latest",          # Latest pro
	"gemini-2.0-flash-exp",       # Experimental (last resort)
	"gemini-pro"                  # Legacy fallback
]

# Try to find available model on startup
MODEL_NAME = None
if GEMINI_API_KEY:
	try:
		# List available models
		models = genai.list_models()
		model_names = [m.name.split('/')[-1] for m in models if 'generateContent' in m.supported_generation_methods]
		
		# Filter out exp/preview models for better free tier quota
		stable_models = [m for m in AVAILABLE_MODELS if m in model_names and 'exp' not in m.lower() and 'preview' not in m.lower()]
		exp_models = [m for m in AVAILABLE_MODELS if m in model_names and ('exp' in m.lower() or 'preview' in m.lower())]
		
		# Priority: stable models first
		if stable_models:
			MODEL_NAME = stable_models[0]
		elif exp_models:
			MODEL_NAME = exp_models[0]
		else:
			# Fallback to first available model from priority list
			for preferred_model in AVAILABLE_MODELS:
				if preferred_model in model_names:
					MODEL_NAME = preferred_model
					break
		
		if not MODEL_NAME:
			# Last resort: use first available model
			if model_names:
				MODEL_NAME = model_names[0]
			else:
				print("[AI Chat] ❌ No available models found!")
	except Exception as e:
		print(f"[AI Chat] ⚠️ Could not list models: {e}")
		# Fallback to default
		MODEL_NAME = "gemini-2.5-flash"


@ai_chat_bp.route('/chat', methods=['POST'])
def chat_with_ai():
	"""Chat with Google Gemini AI"""
	try:
		data = request.get_json()
		message = data.get('message', '').strip()
		language = data.get('language', 'vi')  # 'vi' or 'en'
		
		if not message:
			return jsonify({
				'success': False,
				'message': 'Message is required'
			}), 400
		
		if not GEMINI_API_KEY:
			return jsonify({
				'success': False,
				'message': 'Gemini API key not configured'
			}), 500
		
		if not MODEL_NAME:
			return jsonify({
				'success': False,
				'message': 'No Gemini model available'
			}), 500
		
		# Build prompt with language instruction
		language_instruction = 'Vietnamese' if language == 'vi' else 'English'
		prompt = f"""You are a helpful travel assistant for SkyPlan, a flight booking platform in Vietnam. 
Please respond in {language_instruction} language. 
Be friendly, concise, and helpful. Focus on travel-related topics like destinations, itineraries, tips, and local cuisine.

User question: {message}

Please provide a helpful response in {language_instruction}:"""
		
		# Call Gemini API using SDK with fallback models
		# Get available models for fallback
		try:
			models = genai.list_models()
			available_model_names = [m.name.split('/')[-1] for m in models if 'generateContent' in m.supported_generation_methods]
		except:
			available_model_names = []
		
		# Build fallback list: stable models first, then experimental
		stable_fallbacks = [m for m in AVAILABLE_MODELS if m in available_model_names and m != MODEL_NAME and 'exp' not in m.lower() and 'preview' not in m.lower()]
		exp_fallbacks = [m for m in AVAILABLE_MODELS if m in available_model_names and m != MODEL_NAME and ('exp' in m.lower() or 'preview' in m.lower())]
		models_to_try = [MODEL_NAME] + stable_fallbacks[:2] + exp_fallbacks[:1]  # Try up to 4 models total
		
		last_error = None
		for model_name in models_to_try:
			try:
				model = genai.GenerativeModel(model_name)
				
				generation_config = {
					'temperature': 0.7,
					'top_k': 40,
					'top_p': 0.95,
					'max_output_tokens': 1024,
				}
				
				response = model.generate_content(
					prompt,
					generation_config=generation_config
				)
				
				# Extract response text
				if response and response.text:
					ai_response = response.text.strip()
					return jsonify({
						'success': True,
						'response': ai_response
					}), 200
				else:
					continue
					
			except Exception as gemini_error:
				error_str = str(gemini_error)
				last_error = error_str
				
				# Check if it's a quota error - try next model silently
				if '429' in error_str or 'quota' in error_str.lower() or 'Quota exceeded' in error_str:
					continue
				else:
					# Other errors - try next model
					continue
		
		# All models failed
		print(f"[AI Chat] ❌ All models failed. Last error: {last_error[:200] if last_error else 'Unknown'}")
		return jsonify({
			'success': False,
			'message': f'Gemini API error: {last_error[:200] if last_error else "All models failed"}'
		}), 500
		
	except Exception as e:
		print(f"[AI Chat] ❌ Unexpected error: {str(e)}")
		return jsonify({
			'success': False,
			'message': f'Server error: {str(e)}'
		}), 500

