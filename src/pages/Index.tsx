// ... (inside handleAddConfession)
    // Invoke AI Edge Function for comment
    try {
      const { data: aiCommentResponse, error: aiError } = await supabase.functions.invoke(
        'generate-ai-comment',
        {
          body: JSON.stringify({ confessionContent: content }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (aiError) {
        console.error("Error invoking AI function:", aiError);
        toast.warning("Confession posted, but AI comment failed to generate.");
      } else if (aiCommentResponse) {
        const aiComment = aiCommentResponse as Omit<Comment, 'confession_id'>;
        const { data: insertedAiComment, error: aiInsertError } = await supabase
          .from('comments')
          .insert({
            confession_id: newConfession.id,
            content: aiComment.content,
            gender: aiComment.gender,
            created_at: aiComment.created_at,
          })
          .select()
          .single();

        if (aiInsertError) {
          console.error("Error inserting AI comment:", aiInsertError);
          toast.warning("Confession posted, but AI comment failed to save.");
        } else if (insertedAiComment) {
          newConfession.comments.push(insertedAiComment);
        }
      }
    } catch (aiInvokeError) {
      console.error("Unexpected error during AI function invocation:", aiInvokeError);
      toast.warning("Confession posted, but AI comment failed due to an unexpected error.");
    }
// ...