import { useEffect, useState } from "react";
import { listenToComments } from "../services/comment.service";

const useComments = (parentPath) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComments([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsubscribe = listenToComments(parentPath, (data) => {
      setComments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [parentPath]);

  return { comments, loading };
};

export default useComments;
