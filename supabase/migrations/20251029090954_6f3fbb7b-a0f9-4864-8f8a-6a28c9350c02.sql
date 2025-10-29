-- Add column for best personalized offer
ALTER TABLE comparison_results 
ADD COLUMN best_personalized_offer_id uuid REFERENCES offers(id);

-- Add column to store which logic was used for personalization
ALTER TABLE comparison_results 
ADD COLUMN personalization_factors jsonb DEFAULT '{}'::jsonb;

-- Add index for faster lookups
CREATE INDEX idx_comparison_results_best_personalized ON comparison_results(best_personalized_offer_id);